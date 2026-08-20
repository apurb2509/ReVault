import uuid
from datetime import datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class EventType(StrEnum):
    PAYMENT_FAILED = "payment.failed"
    ORDER_ABANDONED = "order.abandoned"
    SUBSCRIPTION_PENDING = "subscription.pending"
    SUBSCRIPTION_HALTED = "subscription.halted"
    INVOICE_EXPIRED = "invoice.expired"
    PAYMENT_CAPTURED = "payment.captured"


class FailureCause(StrEnum):
    BANK_INFRA_DOWN = "BANK_INFRA_DOWN"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    CARD_EXPIRED = "CARD_EXPIRED"
    CARD_ISSUER_BLOCK = "CARD_ISSUER_BLOCK"
    UPI_RAIL_DEGRADED = "UPI_RAIL_DEGRADED"
    UPI_LIMIT_EXCEEDED = "UPI_LIMIT_EXCEEDED"
    MANDATE_CANCELLED = "MANDATE_CANCELLED"
    AUTH_FAILURE = "AUTH_FAILURE"
    TECHNICAL_ERROR = "TECHNICAL_ERROR"
    GATEWAY_ROUTING_ISSUE = "GATEWAY_ROUTING_ISSUE"
    FRAUD_FILTER_SPIKE = "FRAUD_FILTER_SPIKE"
    # Fraud suspected routes straight to human — no auto-action ever
    FRAUD_SUSPECTED = "FRAUD_SUSPECTED"
    USER_ABANDONED = "USER_ABANDONED"
    UNKNOWN = "UNKNOWN"


class PaymentEvent(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    razorpay_event_id: str
    event_type: EventType
    payment_id: str | None = None
    order_id: str | None = None
    subscription_id: str | None = None
    # Amount stored in paise to avoid floating-point issues
    amount: int | None = None
    currency: str = "INR"
    failure_cause: FailureCause | None = None
    failure_confidence: float | None = None
    raw_payload: dict
    received_at: datetime = Field(default_factory=datetime.utcnow)
