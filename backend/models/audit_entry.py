import uuid
from datetime import datetime
from enum import StrEnum
from pydantic import BaseModel, Field


class Actor(StrEnum):
    SYSTEM = "SYSTEM"
    HUMAN_OVERRIDE = "HUMAN_OVERRIDE"


class AuditEntry(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    module: str
    action_id: uuid.UUID | None = None
    event_id: uuid.UUID | None = None
    actor: Actor = Actor.SYSTEM
    # Full agent thought process — preserved exactly, never mutated
    decision_log: dict = Field(default_factory=dict)
    # Record of every compliance rule checked and its result
    compliance_log: dict = Field(default_factory=dict)
