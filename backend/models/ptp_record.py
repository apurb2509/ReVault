import uuid
from datetime import date, datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class PTPStatus(StrEnum):
    ACTIVE = "ACTIVE"       # Monitoring for payment
    KEPT = "KEPT"           # Payment received before or on promised date
    BROKEN = "BROKEN"       # Promised date passed, no payment
    DISPUTED = "DISPUTED"   # Customer disputed the amount


class CommitmentConfidence(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class PTPRecord(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    customer_id: str
    event_id: uuid.UUID
    promised_amount: int | None = None    # in paise
    promised_date: date
    # The raw channel message that triggered NLP extraction
    extraction_source: str
    commitment_confidence: CommitmentConfidence
    status: PTPStatus = PTPStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: datetime | None = None
