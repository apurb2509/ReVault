import uuid
from datetime import datetime, date
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from models.recovery_action import RecoveryAction
from tools.gemini_client import get_gemini_client

@dataclass
class InvoiceState:
    invoice_id: str
    days_outstanding: int
    amount: int
    company: str

class B2BReceivablesChaser:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_gemini_client()

    async def process_invoice(self, event_id: str, state: InvoiceState) -> RecoveryAction:
        """
        Determines the risk tier and generates an appropriate recovery action.
        """
        tier = self._get_risk_tier(state.days_outstanding)
        
        # In a real scenario, LLM generates personalized message
        prompt = f"Draft a {tier} severity B2B collection message for {state.company} owing {state.amount}."
        # ai_draft = await self.llm.generate(prompt)
        ai_draft = f"[Simulated LLM Draft] Dear {state.company}, please clear your outstanding dues."
        
        if tier == "GREEN":
            channel = "EMAIL"
            action_type = "POLITE_REMINDER"
        elif tier == "YELLOW":
            channel = "WHATSAPP"
            action_type = "URGENT_NUDGE"
        elif tier == "ORANGE":
            channel = "VOICE"
            action_type = "VOICE_CALL_TRIGGERED"
        else: # RED
            channel = "ESCALATE_HUMAN"
            action_type = "FORMAL_NOTICE"

        action = RecoveryAction(
            id=uuid.uuid4(),
            event_id=uuid.UUID(event_id),
            module="B2B_RECEIVABLES_CHASER",
            action_type=action_type,
            channel=channel,
            payload={"draft": ai_draft, "tier": tier},
            agent_reasoning=f"Invoice outstanding for {state.days_outstanding} days (Tier {tier}). Assigned to {channel}.",
            outcome="PENDING",
            amount_recovered=0
        )
        return action

    def _get_risk_tier(self, days_outstanding: int) -> str:
        if days_outstanding <= 30:
            return "GREEN"
        elif days_outstanding <= 60:
            return "YELLOW"
        elif days_outstanding <= 90:
            return "ORANGE"
        else:
            return "RED"
