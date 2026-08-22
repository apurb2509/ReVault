"""
Module: B2B Receivables Chaser (class-based version)
Used by the batch runner and graph node wrapper.
Scores invoice risk via Gemini and routes to the correct recovery channel.
"""
import uuid
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from models.recovery_action import RecoveryAction, RecoveryModule, ActionType
from tools.gemini_client import get_gemini_client


@dataclass
class InvoiceState:
    invoice_id: str
    days_outstanding: int
    amount: int        # paise
    company: str
    contact_email: str = ""
    contact_phone: str = ""


class B2BReceivablesChaser:
    """
    Class-based B2B collections agent — used by the batch runner and
    the graph node wrapper in agents/graph.py.
    For the LangGraph functional version, see agents/receivables_pursuit.py.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.llm = get_gemini_client()

    async def process_invoice(self, event_id: str, state: InvoiceState) -> RecoveryAction:
        """
        Determines the risk tier, generates an AI recovery message,
        and returns a RecoveryAction to pass through the compliance gate.
        """
        tier = self._get_risk_tier(state.days_outstanding)

        # Build Gemini prompt for personalized B2B collections message
        prompt = (
            f"You are a B2B collections analyst. Draft a {tier.lower()} severity "
            f"collection message for {state.company} owing ₹{state.amount / 100:,.2f}. "
            f"Invoice is {state.days_outstanding} days overdue. "
            "Be professional, firm but polite. Maximum 3 sentences. "
            'Return JSON: {{"message": "<text>", "tone": "<gentle|firm|legal>"}}'
        )

        try:
            ai_result = await self.llm.generate(prompt)
            ai_draft = ai_result.get("message", f"Dear {state.company}, please clear your outstanding dues.")
            tone = ai_result.get("tone", "firm")
        except Exception:
            ai_draft = f"[AI Draft] Dear {state.company}, your invoice of ₹{state.amount / 100:,.2f} is {state.days_outstanding} days overdue. Please arrange payment immediately."
            tone = "firm"

        # Map tier to channel and action
        if tier == "GREEN":
            channel = "EMAIL"
            action_type = ActionType.POLITE_REMINDER
        elif tier == "YELLOW":
            channel = "WHATSAPP"
            action_type = ActionType.URGENT_NUDGE
        elif tier == "ORANGE":
            channel = "VOICE"
            action_type = ActionType.VOICE_CALL_TRIGGERED
        else:  # RED — 90+ days, stop AI contact
            channel = "ESCALATE_HUMAN"
            action_type = ActionType.FORMAL_NOTICE

        return RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module=RecoveryModule.B2B_RECEIVABLES_CHASER,
            action_type=action_type,
            channel=channel,
            payload={"draft": ai_draft, "tier": tier, "tone": tone, "days_outstanding": state.days_outstanding},
            agent_reasoning=(
                f"Invoice outstanding for {state.days_outstanding} days → Tier {tier}. "
                f"AI tone: {tone}. Routed to {channel}."
            ),
            outcome="PENDING",
            amount_recovered=0,
        )

    def _get_risk_tier(self, days_outstanding: int) -> str:
        if days_outstanding <= 30:
            return "GREEN"
        elif days_outstanding <= 60:
            return "YELLOW"
        elif days_outstanding <= 90:
            return "ORANGE"
        else:
            return "RED"
