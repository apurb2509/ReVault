"""
Module: Subscription & Mandate Engine (class-based)
Handles subscription.pending and mandate failures.
Used by both the LangGraph node wrappers in graph.py and the batch runner.
"""
import json
import uuid
from dataclasses import dataclass
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from models.recovery_action import RecoveryAction, RecoveryModule, ActionType
from tools.gemini_client import get_gemini_client
from tools.payment_links import PaymentLinkGenerator


@dataclass
class RetryDecision:
    delay_hours: int
    rail: str
    action_type: str


class SubscriptionMandateEngine:
    """
    Unified handler for subscription.pending and mandate failures.
    Selects cause-specific retry rail and delay, then creates a RecoveryAction.
    """

    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        self.db = db
        self.redis = redis
        self.llm = get_gemini_client()
        self.link_gen = PaymentLinkGenerator()

    async def process_failure(
        self,
        event_id: str,
        cause: str,
        customer_id: str,
        amount: int,
        is_subscription_halted: bool = False,
    ) -> dict[str, Any]:
        """
        Returns dict with keys: 'action' (RecoveryAction) and 'decision' (RetryDecision).
        """
        state_key = f"revault:sub_state:{customer_id}"
        state_raw = await self.redis.get(state_key)

        if state_raw:
            state = json.loads(state_raw)
            attempt = state.get("attempt_count", 0) + 1
        else:
            attempt = 1
            state = {"attempt_count": 0}

        if is_subscription_halted:
            return await self._handle_halted(event_id, customer_id, attempt)

        decision = await self._get_retry_decision(cause, attempt)

        reasoning = (
            f"Attempt {attempt} for cause={cause}. "
            f"Selected rail: {decision.rail}, delay: {decision.delay_hours}h."
        )

        action = RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module=RecoveryModule.SUBSCRIPTION_MANDATE_ENGINE,
            action_type=decision.action_type,
            channel="SYSTEM" if decision.rail == "NATIVE_RETRY" else "WHATSAPP",
            payload={"next_retry_in_hours": decision.delay_hours, "rail": decision.rail},
            agent_reasoning=reasoning,
            outcome="PENDING",
            amount_recovered=0,
        )

        state["attempt_count"] = attempt
        await self.redis.set(state_key, json.dumps(state), ex=86_400 * 30)

        return {"action": action, "decision": decision}

    async def _get_retry_decision(self, cause: str, attempt: int) -> RetryDecision:
        """Dynamic retry matrix — cause × attempt → (delay, rail, action)."""
        if cause == "BANK_INFRA_DOWN":
            delays = {1: 2, 2: 6, 3: 24}
            return RetryDecision(
                delay_hours=delays.get(attempt, 24),
                rail="NATIVE_RETRY",
                action_type=ActionType.RETRY_SCHEDULED,
            )
        elif cause == "INSUFFICIENT_FUNDS":
            # Target salary day: 3-day, 6-day, 10-day cadence
            delays = {1: 72, 2: 144, 3: 240}
            return RetryDecision(
                delay_hours=delays.get(attempt, 72),
                rail="NATIVE_RETRY",
                action_type=ActionType.RETRY_SCHEDULED,
            )
        elif cause == "UPI_LIMIT_EXCEEDED":
            if attempt == 1:
                return RetryDecision(delay_hours=0, rail="CARD_AUTODEBIT", action_type=ActionType.SWITCH_RAIL)
            else:
                return RetryDecision(delay_hours=0, rail="PAYMENT_LINK", action_type=ActionType.SEND_LINK)
        elif cause in ("CARD_EXPIRED", "CARD_ISSUER_BLOCK"):
            return RetryDecision(delay_hours=0, rail="CARD_UPDATE", action_type=ActionType.CARD_UPDATE_LINK_SENT)
        elif cause == "MANDATE_CANCELLED":
            return RetryDecision(delay_hours=0, rail="PAYMENT_LINK", action_type=ActionType.ALTERNATIVE_LINK_SENT)
        else:
            return RetryDecision(delay_hours=1, rail="NATIVE_RETRY", action_type=ActionType.RETRY_SCHEDULED)

    async def _handle_halted(
        self,
        event_id: str,
        customer_id: str,
        attempt: int,
    ) -> dict[str, Any]:
        """Win-back sequence for halted subscriptions."""
        # Escalating channel strategy as attempts increase
        if attempt == 1:
            channel = "WHATSAPP"
        elif attempt == 2:
            channel = "VOICE"
        else:
            channel = "ESCALATE_HUMAN"

        action = RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module=RecoveryModule.SUBSCRIPTION_MANDATE_ENGINE,
            action_type=ActionType.WINBACK_SEQUENCE,
            channel=channel,
            payload={"win_back_step": attempt},
            agent_reasoning=(
                f"Subscription halted. Executing win-back step {attempt} via {channel}. "
                "Sequence: Day 0 WhatsApp → Day 2 Voice → Day 7+ Human escalation."
            ),
            outcome="PENDING",
            amount_recovered=0,
        )
        return {"action": action}
