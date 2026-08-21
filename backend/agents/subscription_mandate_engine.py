import uuid
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from models.recovery_action import RecoveryAction
from tools.gemini_client import get_gemini_client
from tools.payment_links import PaymentLinkGenerator

@dataclass
class RetryDecision:
    delay_hours: int
    rail: str
    action_type: str

class SubscriptionMandateEngine:
    def __init__(self, db: AsyncSession, redis: aioredis.Redis):
        self.db = db
        self.redis = redis
        self.llm = get_gemini_client()
        self.link_gen = PaymentLinkGenerator()
        
    async def process_failure(self, event_id: str, cause: str, customer_id: str, amount: int, is_subscription_halted: bool = False) -> Dict[str, Any]:
        """
        Unified handler for both subscription.pending and mandate failures.
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
        
        reasoning = f"Attempt {attempt} for {cause}. Selected rail: {decision.rail}, delay: {decision.delay_hours}h."
        
        action = RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module="SUBSCRIPTION_MANDATE_ENGINE",
            action_type=decision.action_type,
            channel="SYSTEM" if decision.rail == "NATIVE_RETRY" else "WHATSAPP",
            payload={"next_retry_in_hours": decision.delay_hours, "rail": decision.rail},
            agent_reasoning=reasoning,
            outcome="PENDING",
            amount_recovered=0
        )
        
        state["attempt_count"] = attempt
        await self.redis.set(state_key, json.dumps(state), ex=86400 * 30)
        
        return {"action": action, "decision": decision}
        
    async def _get_retry_decision(self, cause: str, attempt: int) -> RetryDecision:
        # Dynamic matrix logic based on spec
        if cause == "BANK_INFRA_DOWN":
            delays = {1: 2, 2: 6, 3: 24}
            return RetryDecision(delay_hours=delays.get(attempt, 24), rail="NATIVE_RETRY", action_type="RETRY_SCHEDULED")
        elif cause == "INSUFFICIENT_FUNDS":
            # For simplicity in demo, assuming salary day prediction gives 3 days out
            delays = {1: 72, 2: 72 + 72, 3: 72 + 168}
            return RetryDecision(delay_hours=delays.get(attempt, 72), rail="NATIVE_RETRY", action_type="RETRY_SCHEDULED")
        elif cause == "UPI_LIMIT_EXCEEDED":
            if attempt == 1:
                return RetryDecision(delay_hours=0, rail="CARD_AUTODEBIT", action_type="SWITCH_RAIL")
            else:
                return RetryDecision(delay_hours=0, rail="PAYMENT_LINK", action_type="SEND_LINK")
        else:
            return RetryDecision(delay_hours=1, rail="NATIVE_RETRY", action_type="RETRY_SCHEDULED")

    async def _handle_halted(self, event_id: str, customer_id: str, attempt: int) -> Dict[str, Any]:
        action_type = "WINBACK_SEQUENCE"
        if attempt == 1:
            channel = "WHATSAPP"
        elif attempt == 2:
            channel = "VOICE"
        else:
            channel = "ESCALATE_HUMAN"
            
        action = RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module="SUBSCRIPTION_MANDATE_ENGINE",
            action_type=action_type,
            channel=channel,
            payload={},
            agent_reasoning=f"Subscription halted. Executing win-back step {attempt} via {channel}.",
            outcome="PENDING",
            amount_recovered=0
        )
        return {"action": action}
