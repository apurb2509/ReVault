import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.recovery_action import RecoveryAction
from services.audit_logger import AuditLogger

settings = get_settings()


@dataclass
class ComplianceResult:
    allowed: bool
    reason: str = ""


@dataclass
class CheckResult:
    passed: bool
    reason: str = ""


class ComplianceEngine:
    """
    Every agent action must pass through check() before execution.
    The LLM recommends — this engine decides.
    A BLOCKED result is always logged; it never silently disappears.
    """

    def __init__(
        self,
        db: AsyncSession,
        redis: aioredis.Redis,
        audit_logger: AuditLogger,
    ) -> None:
        self._db = db
        self._redis = redis
        self._audit = audit_logger

    async def check(self, action: RecoveryAction, customer_id: str) -> ComplianceResult:
        checks = [
            await self._check_opted_out(customer_id),
            await self._check_time_window(),
            await self._check_max_attempts(action.event_id),
            await self._check_cooling_period(customer_id),
            await self._check_fraud_flag(action.event_id),
            await self._check_dispute_flag(action.event_id),
            await self._check_chargeback(action.event_id),
            await self._check_daily_contact_limit(customer_id),
        ]

        compliance_log = {
            "checks": [
                {"name": c.__class__.__name__, "passed": c.passed, "reason": c.reason}
                for c in checks
            ]
        }

        for check in checks:
            if not check.passed:
                await self._audit.log_blocked(action, check.reason)
                return ComplianceResult(allowed=False, reason=check.reason)

        return ComplianceResult(allowed=True)

    async def _check_opted_out(self, customer_id: str) -> CheckResult:
        key = f"revault:optout:{customer_id}"
        if await self._redis.exists(key):
            return CheckResult(passed=False, reason=f"Customer {customer_id} has opted out of automated recovery")
        return CheckResult(passed=True)

    async def _check_time_window(self) -> CheckResult:
        # TRAI DLT compliance: no automated outreach before 9 AM or after 9 PM IST
        now = datetime.now(timezone.utc)
        # Correctly convert UTC to IST (UTC+5:30)
        total_minutes_utc = now.hour * 60 + now.minute
        ist_total_minutes = (total_minutes_utc + 330) % 1440  # 330 = 5hr 30min offset
        ist_hour = ist_total_minutes // 60
        if ist_hour < settings.contact_start_hour or ist_hour >= settings.contact_end_hour:
            return CheckResult(
                passed=False,
                reason=f"Contact blocked: current IST hour {ist_hour} is outside {settings.contact_start_hour}–{settings.contact_end_hour} window",
            )
        return CheckResult(passed=True)

    async def _check_max_attempts(self, event_id: uuid.UUID) -> CheckResult:
        result = await self._db.execute(
            text("SELECT COUNT(*) FROM recovery_actions WHERE event_id = :eid AND compliance_checked = TRUE"),
            {"eid": str(event_id)},
        )
        # scalar_one() returns a coroutine when result is an AsyncMock
        raw = result.scalar_one()
        if asyncio.iscoroutine(raw):
            count = await raw
        else:
            count = raw
        if count >= settings.max_recovery_attempts:
            return CheckResult(
                passed=False,
                reason=f"Max recovery attempts ({settings.max_recovery_attempts}) reached for event {event_id}",
            )
        return CheckResult(passed=True)

    async def _check_cooling_period(self, customer_id: str) -> CheckResult:
        key = f"revault:lastcontact:{customer_id}"
        last_contact = await self._redis.get(key)
        if last_contact:
            return CheckResult(
                passed=False,
                reason=f"Cooling period active for customer {customer_id} — contacted too recently",
            )
        return CheckResult(passed=True)

    async def _check_fraud_flag(self, event_id: uuid.UUID) -> CheckResult:
        # Fraud-suspected events must never receive automated contact
        result = await self._db.execute(
            text("SELECT failure_cause FROM payment_events WHERE id = :eid"),
            {"eid": str(event_id)},
        )
        row = result.fetchone()
        if row and row[0] == "FRAUD_SUSPECTED":
            return CheckResult(
                passed=False,
                reason="Fraud-suspected payment — zero auto-action, human escalation required",
            )
        return CheckResult(passed=True)

    async def _check_dispute_flag(self, event_id: uuid.UUID) -> CheckResult:
        key = f"revault:dispute:{event_id}"
        if await self._redis.exists(key):
            return CheckResult(
                passed=False,
                reason=f"Active dispute on event {event_id} — all recovery actions frozen",
            )
        return CheckResult(passed=True)

    async def _check_chargeback(self, event_id: uuid.UUID) -> CheckResult:
        key = f"revault:chargeback:{event_id}"
        if await self._redis.exists(key):
            return CheckResult(
                passed=False,
                reason=f"Chargeback initiated on event {event_id} — compliance hold, no further contact",
            )
        return CheckResult(passed=True)

    async def _check_daily_contact_limit(self, customer_id: str) -> CheckResult:
        # Hard limit: max 2 contacts per customer per calendar day
        key = f"revault:dailycontact:{customer_id}:{datetime.utcnow().date()}"
        count_str = await self._redis.get(key)
        count = int(count_str) if count_str else 0
        if count >= 2:
            return CheckResult(
                passed=False,
                reason=f"Daily contact limit reached for customer {customer_id}",
            )
        return CheckResult(passed=True)

    async def record_contact(self, customer_id: str) -> None:
        """Call this after a contact is successfully sent to update rate-limit counters."""
        cooling_key = f"revault:lastcontact:{customer_id}"
        daily_key = f"revault:dailycontact:{customer_id}:{datetime.utcnow().date()}"

        await self._redis.set(cooling_key, "1", ex=settings.cooling_period_hours * 3600)
        await self._redis.incr(daily_key)
        # Daily key expires at midnight+1min to avoid stale counts
        await self._redis.expire(daily_key, 86_460)

    async def set_opt_out(self, customer_id: str) -> None:
        key = f"revault:optout:{customer_id}"
        # Permanent opt-out — no expiry
        await self._redis.set(key, "1")

    async def set_dispute_flag(self, event_id: uuid.UUID) -> None:
        key = f"revault:dispute:{event_id}"
        await self._redis.set(key, "1", ex=30 * 86400)    # 30-day hold
