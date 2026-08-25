import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

import redis.asyncio as aioredis

from models.payment_event import FailureCause


class RetryStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


class RetryRail(StrEnum):
    UPI = "UPI"
    CARD = "CARD"
    PAYMENT_LINK = "PAYMENT_LINK"


@dataclass
class RetryState:
    payment_id: str
    event_id: str
    cause: FailureCause
    attempt_count: int
    max_attempts: int
    next_retry_at: datetime
    retry_rail: RetryRail
    status: RetryStatus
    escalated: bool
    opted_out: bool


# Maps failure cause to retry delays in seconds per attempt index
_RETRY_DELAYS: dict[FailureCause, list[int]] = {
    FailureCause.BANK_INFRA_DOWN: [7_200, 21_600, 86_400],         # 2h, 6h, 24h
    FailureCause.INSUFFICIENT_FUNDS: [0, 259_200, 604_800],         # salary day, +3d, +7d
    FailureCause.UPI_LIMIT_EXCEEDED: [0, 0],                        # switch to card, then link
    FailureCause.MANDATE_CANCELLED: [0],                            # send re-mandate link
    FailureCause.AUTH_FAILURE: [0, 86_400],                         # OTP link, next day
    FailureCause.TECHNICAL_ERROR: [900, 3_600, 14_400],             # 15m, 1h, 4h
    FailureCause.CARD_EXPIRED: [0],                                 # card update link immediately
    FailureCause.CARD_ISSUER_BLOCK: [0],                            # card update link immediately
}

_RETRY_RAILS: dict[FailureCause, list[RetryRail]] = {
    FailureCause.UPI_LIMIT_EXCEEDED: [RetryRail.CARD, RetryRail.PAYMENT_LINK],
    FailureCause.BANK_INFRA_DOWN: [RetryRail.UPI, RetryRail.UPI, RetryRail.PAYMENT_LINK],
    FailureCause.INSUFFICIENT_FUNDS: [RetryRail.UPI, RetryRail.UPI, RetryRail.PAYMENT_LINK],
    FailureCause.TECHNICAL_ERROR: [RetryRail.UPI, RetryRail.UPI, RetryRail.PAYMENT_LINK],
}


class RetryScheduler:
    """
    Redis-backed state machine for per-payment retry scheduling.
    Enforces max_attempts hard limit — never retries beyond it.
    """

    def __init__(self, redis: aioredis.Redis, max_attempts: int = 3) -> None:
        self._redis = redis
        self._max_attempts = max_attempts

    def _key(self, event_id: str) -> str:
        return f"revault:retry:{event_id}"

    async def create(self, event_id: uuid.UUID, payment_id: str, cause: FailureCause) -> RetryState:
        delays = _RETRY_DELAYS.get(cause, [3_600])
        rails = _RETRY_RAILS.get(cause, [RetryRail.UPI])
        next_delay = delays[0] if delays else 3_600
        next_rail = rails[0] if rails else RetryRail.UPI

        state = RetryState(
            payment_id=payment_id,
            event_id=str(event_id),
            cause=cause,
            attempt_count=0,
            max_attempts=self._max_attempts,
            next_retry_at=datetime.utcnow(),
            retry_rail=next_rail,
            status=RetryStatus.SCHEDULED,
            escalated=False,
            opted_out=False,
        )
        await self._save(state)
        return state

    async def get(self, event_id: uuid.UUID) -> RetryState | None:
        raw = await self._redis.get(self._key(str(event_id)))
        if not raw:
            return None
        data = json.loads(raw)
        data["cause"] = FailureCause(data["cause"])
        data["retry_rail"] = RetryRail(data["retry_rail"])
        data["status"] = RetryStatus(data["status"])
        data["next_retry_at"] = datetime.fromisoformat(data["next_retry_at"])
        return RetryState(**data)

    async def advance(self, event_id: uuid.UUID, new_cause: FailureCause) -> RetryState | None:
        """
        Re-classifies the cause on each retry attempt (maybe funds appeared).
        Returns None if max attempts are exhausted.
        """
        state = await self.get(event_id)
        if state is None:
            return None

        state.attempt_count += 1
        state.cause = new_cause

        if state.attempt_count >= state.max_attempts:
            state.status = RetryStatus.ABANDONED
            state.escalated = True
            await self._save(state)
            return None

        delays = _RETRY_DELAYS.get(new_cause, [3_600])
        rails = _RETRY_RAILS.get(new_cause, [RetryRail.UPI])
        attempt_idx = min(state.attempt_count, len(delays) - 1)

        state.next_retry_at = datetime.utcnow()
        state.retry_rail = rails[min(state.attempt_count, len(rails) - 1)]
        state.status = RetryStatus.SCHEDULED
        await self._save(state)
        return state

    async def mark_completed(self, event_id: uuid.UUID) -> None:
        state = await self.get(event_id)
        if state:
            state.status = RetryStatus.COMPLETED
            await self._save(state)

    async def mark_opted_out(self, event_id: uuid.UUID) -> None:
        state = await self.get(event_id)
        if state:
            state.opted_out = True
            state.status = RetryStatus.ABANDONED
            await self._save(state)

    async def _save(self, state: RetryState) -> None:
        data = {
            **state.__dict__,
            "cause": state.cause.value,
            "retry_rail": state.retry_rail.value,
            "status": state.status.value,
            "next_retry_at": state.next_retry_at.isoformat(),
        }
        # TTL of 30 days — abandoned states are not needed indefinitely
        await self._redis.set(self._key(state.event_id), json.dumps(data), ex=30 * 86_400)

        # Mirror to Supabase
        try:
            from db.supabase_client import supabase
            if supabase:
                record = {
                    "event_id": state.event_id,
                    "attempt_number": state.attempt_count,
                    "max_attempts": state.max_attempts,
                    "next_retry_at": state.next_retry_at.isoformat(),
                    "retry_rail": state.retry_rail.value,
                    "cause": state.cause.value,
                    "status": state.status.value
                }
                res = supabase.table("retry_schedules").select("id").eq("event_id", state.event_id).execute()
                if res.data:
                    supabase.table("retry_schedules").update(record).eq("event_id", state.event_id).execute()
                else:
                    supabase.table("retry_schedules").insert(record).execute()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Failed to mirror retry schedule to Supabase: %s", e)
