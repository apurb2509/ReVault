import uuid
from datetime import date, datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class RiskTier(StrEnum):
    GREEN = "GREEN"     # 0-30 days outstanding
    YELLOW = "YELLOW"   # 31-60 days
    ORANGE = "ORANGE"   # 61-90 days
    RED = "RED"         # 90+ days — human escalation, stop AI contact


class InvoiceStatus(StrEnum):
    OUTSTANDING = "OUTSTANDING"
    PTP = "PTP"           # Customer has made a payment promise
    PAID = "PAID"
    DISPUTED = "DISPUTED"
    ESCALATED = "ESCALATED"


class Invoice(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    invoice_number: str
    customer_company: str
    customer_contact: str
    customer_phone: str
    amount: int    # in paise
    due_date: date
    risk_tier: RiskTier = RiskTier.GREEN
    # Razorpay payment link ID — populated once a link is created
    payment_link_id: str | None = None
    status: InvoiceStatus = InvoiceStatus.OUTSTANDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def days_outstanding(self) -> int:
        return (date.today() - self.due_date).days
