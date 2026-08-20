import uuid
from datetime import datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class RecoveryModule(StrEnum):
    DEGRADATION_WATCHDOG = "DEGRADATION_WATCHDOG"
    ABANDONMENT_HUNTER = "ABANDONMENT_HUNTER"
    SUBSCRIPTION_RESCUE = "SUBSCRIPTION_RESCUE"
    RECEIVABLES_PURSUIT = "RECEIVABLES_PURSUIT"
    MANDATE_SEQUENCER = "MANDATE_SEQUENCER"
    VOICE_AGENT = "VOICE_AGENT"
    PTP_TRACKER = "PTP_TRACKER"
    COMPLIANCE_ENGINE = "COMPLIANCE_ENGINE"


class ActionType(StrEnum):
    WHATSAPP_SENT = "WHATSAPP_SENT"
    EMAIL_SENT = "EMAIL_SENT"
    VOICE_CALL_INITIATED = "VOICE_CALL_INITIATED"
    PAYMENT_LINK_CREATED = "PAYMENT_LINK_CREATED"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"
    ADVISORY_GENERATED = "ADVISORY_GENERATED"
    PTP_CREATED = "PTP_CREATED"
    COMPLIANCE_BLOCKED = "COMPLIANCE_BLOCKED"


class ActionOutcome(StrEnum):
    PENDING = "PENDING"
    DELIVERED = "DELIVERED"
    OPENED = "OPENED"
    PAYMENT_MADE = "PAYMENT_MADE"
    NO_RESPONSE = "NO_RESPONSE"
    FAILED = "FAILED"
    OPTED_OUT = "OPTED_OUT"
    BLOCKED = "BLOCKED"


class RecoveryAction(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_id: uuid.UUID
    module: RecoveryModule
    action_type: ActionType
    channel: str | None = None
    payload: dict = Field(default_factory=dict)
    # Full Gemini reasoning stored verbatim — never summarised or truncated
    agent_reasoning: str | None = None
    compliance_checked: bool = True
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    outcome: ActionOutcome = ActionOutcome.PENDING
    outcome_recorded_at: datetime | None = None
    # NULL until a real payment.captured webhook confirms recovery
    amount_recovered: int | None = None
