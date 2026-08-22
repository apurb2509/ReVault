import uuid
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_entry import Actor, AuditEntry
from models.recovery_action import RecoveryAction


class AuditLogger:
    """
    Append-only writer for the audit trail.
    Every agent decision, compliance check result, and external API call
    flows through here — nothing is summarised or redacted.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def log(
        self,
        module: str,
        decision_log: dict,
        compliance_log: dict,
        event_id: uuid.UUID | None = None,
        action_id: uuid.UUID | None = None,
        actor: Actor = Actor.SYSTEM,
    ) -> AuditEntry:
        entry = AuditEntry(
            module=module,
            action_id=action_id,
            event_id=event_id,
            actor=actor,
            decision_log=decision_log,
            compliance_log=compliance_log,
        )
        await self._insert(entry)
        return entry

    async def log_action(self, action: RecoveryAction, reasoning: dict) -> None:
        await self.log(
            module=action.module,
            decision_log=reasoning,
            compliance_log={"compliance_checked": action.compliance_checked},
            event_id=action.event_id,
            action_id=action.id,
        )

    async def log_blocked(self, action: RecoveryAction, reason: str) -> None:
        await self.log(
            module=action.module,
            decision_log={"blocked": True, "reason": reason},
            compliance_log={"allowed": False, "reason": reason},
            event_id=action.event_id,
            action_id=None,  # Blocked actions are never persisted to DB, so FK would fail
        )

    async def _insert(self, entry: AuditEntry) -> None:
        # Use raw SQL to guarantee append-only semantics — no ORM update paths
        await self._db.execute(
            text(
                """
                INSERT INTO audit_trail
                    (id, timestamp, module, action_id, event_id, actor, decision_log, compliance_log)
                VALUES
                    (:id, :timestamp, :module, :action_id, :event_id, :actor,
                     CAST(:decision_log AS JSONB), CAST(:compliance_log AS JSONB))
                """
            ),
            {
                "id": str(entry.id),
                "timestamp": entry.timestamp,
                "module": entry.module,
                "action_id": str(entry.action_id) if entry.action_id else None,
                "event_id": str(entry.event_id) if entry.event_id else None,
                "actor": entry.actor,
                "decision_log": _json(entry.decision_log),
                "compliance_log": _json(entry.compliance_log),
            },
        )


def _json(obj: dict) -> str:
    import json
    return json.dumps(obj, default=str)
