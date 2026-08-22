import uuid
from datetime import datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class RecoveryModule(StrEnum):
    DEGRADATION_WATCHDOG = "DEGRADATION_WATCHDOG"
    ABANDONMENT_HUNTER = "ABANDONMENT_HUNTER"
    SUBSCRIPTION_RESCUE = "SUBSCRIPTION_RESCUE"
    SUBSCRIPTION_MANDATE_ENGINE = "SUBSCRIPTION_MANDATE_ENGINE"
    RECEIVABLES_PURSUIT = "RECEIVABLES_PURSUIT"
    B2B_RECEIVABLES_CHASER = "B2B_RECEIVABLES_CHASER"
    MANDATE_SEQUENCER = "MANDATE_SEQUENCER"
    VOICE_AGENT = "VOICE_AGENT"
    PTP_TRACKER = "PTP_TRACKER"
    COMPLIANCE_ENGINE = "COMPLIANCE_ENGINE"
    TEST_MODULE = "TEST_MODULE"


class ActionType(StrEnum):
    WHATSAPP_SENT = "WHATSAPP_SENT"
    EMAIL_SENT = "EMAIL_SENT"
    VOICE_CALL_INITIATED = "VOICE_CALL_INITIATED"
    PAYMENT_LINK_CREATED = "PAYMENT_LINK_CREATED"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"
    ADVISORY_GENERATED = "ADVISORY_GENERATED"
    PTP_CREATED = "PTP_CREATED"
    PTP_LOGGED = "PTP_LOGGED"
    PTP_RESOLVED = "PTP_RESOLVED"
    COMPLIANCE_BLOCKED = "COMPLIANCE_BLOCKED"
    INITIALIZED = "INITIALIZED"
    ADVANCED = "ADVANCED"
    MAX_ATTEMPTS_REACHED = "MAX_ATTEMPTS_REACHED"
    # Abandonment Hunter
    DISCOUNT_OFFERED = "DISCOUNT_OFFERED"
    INSTANT_RECOVERY = "INSTANT_RECOVERY"
    FINAL_NUDGE = "FINAL_NUDGE"
    # Subscription Rescue
    CARD_UPDATE_LINK_SENT = "CARD_UPDATE_LINK_SENT"
    ALTERNATIVE_LINK_SENT = "ALTERNATIVE_LINK_SENT"
    WIN_BACK_INITIATED = "WIN_BACK_INITIATED"
    WINBACK_SEQUENCE = "WINBACK_SEQUENCE"
    # B2B Chaser
    POLITE_REMINDER = "POLITE_REMINDER"
    URGENT_NUDGE = "URGENT_NUDGE"
    VOICE_CALL_TRIGGERED = "VOICE_CALL_TRIGGERED"
    FORMAL_NOTICE = "FORMAL_NOTICE"
    # Mandate Sequencer
    SWITCH_RAIL = "SWITCH_RAIL"
    SEND_LINK = "SEND_LINK"
    # Test/internal use
    TEST_ACTION = "TEST_ACTION"


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
