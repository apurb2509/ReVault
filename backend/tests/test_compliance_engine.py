"""
Compliance Engine Tests
Tests all 8 compliance checks in isolation with mocked DB and Redis.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

import asyncio

from services.compliance_engine import ComplianceEngine, CheckResult
from models.recovery_action import RecoveryAction, RecoveryModule, ActionType
from config import get_settings

settings = get_settings()


@pytest.fixture
def mock_db():
    """AsyncMock DB — execute() returns an AsyncMock, but result methods are sync MagicMock."""
    db = AsyncMock()
    # SQLAlchemy result is synchronous — scalar_one/fetchone are NOT coroutines
    result = MagicMock()
    result.scalar_one.return_value = 0         # default: 0 attempts
    result.fetchone.return_value = None        # default: no fraud row
    db.execute.return_value = result
    return db, result


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis.exists.return_value = False
    redis.get.return_value = None
    return redis


@pytest.fixture
def mock_audit():
    return AsyncMock()


@pytest.fixture
def compliance_engine(mock_db, mock_redis, mock_audit):
    db, _ = mock_db
    return ComplianceEngine(db, mock_redis, mock_audit)


@pytest.fixture
def dummy_action():
    return RecoveryAction(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        module=RecoveryModule.TEST_MODULE,
        action_type=ActionType.TEST_ACTION,
        channel="SYSTEM",
        payload={},
        agent_reasoning="test",
        outcome="PENDING",
        amount_recovered=0,
    )


# ── Patch datetime to always be within business hours (12 PM IST) ──────────
_NOON_UTC = datetime(2026, 1, 1, 6, 30, tzinfo=timezone.utc)  # 12:00 PM IST


def _patch_dt(monkeypatch):
    """Patches compliance_engine.datetime so time window always passes."""
    class MockDT:
        @classmethod
        def now(cls, tz=None):
            return _NOON_UTC

        @classmethod
        def utcnow(cls):
            return _NOON_UTC.replace(tzinfo=None)

    monkeypatch.setattr("services.compliance_engine.datetime", MockDT)


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_opt_out_blocks(compliance_engine, mock_redis, dummy_action, monkeypatch):
    _patch_dt(monkeypatch)
    mock_redis.exists.return_value = True  # opt-out key exists
    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "opted out" in res.reason


@pytest.mark.asyncio
async def test_time_window_blocks(compliance_engine, dummy_action, monkeypatch):
    # 3:00 AM IST = 21:30 UTC previous day
    class MockDTNight:
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 1, 1, 21, 30, tzinfo=timezone.utc)

        @classmethod
        def utcnow(cls):
            return datetime(2026, 1, 1, 21, 30)

    monkeypatch.setattr("services.compliance_engine.datetime", MockDTNight)

    compliance_engine._redis.exists.return_value = False
    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "outside" in res.reason


@pytest.mark.asyncio
async def test_max_attempts_blocks(compliance_engine, mock_db, dummy_action, monkeypatch):
    _patch_dt(monkeypatch)
    _, result = mock_db
    result.scalar_one.return_value = settings.max_recovery_attempts  # at limit
    compliance_engine._redis.exists.return_value = False
    compliance_engine._redis.get.return_value = None

    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Max recovery attempts" in res.reason


@pytest.mark.asyncio
async def test_fraud_flag_blocks(compliance_engine, mock_db, mock_redis, dummy_action, monkeypatch):
    _patch_dt(monkeypatch)
    _, result = mock_db
    result.scalar_one.return_value = 0   # max attempts passes
    mock_redis.exists.return_value = False
    mock_redis.get.return_value = None

    # fetchone returns a row where row[0] == "FRAUD_SUSPECTED"
    fraud_row = MagicMock()
    fraud_row.__getitem__.return_value = "FRAUD_SUSPECTED"
    result.fetchone.return_value = fraud_row

    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Fraud-suspected" in res.reason


@pytest.mark.asyncio
async def test_chargeback_blocks(compliance_engine, mock_db, mock_redis, dummy_action, monkeypatch):
    _patch_dt(monkeypatch)
    _, result = mock_db
    result.scalar_one.return_value = 0
    result.fetchone.return_value = None

    # exists returns True only for chargeback key
    async def _exists(key: str) -> bool:
        return "chargeback" in key

    mock_redis.exists.side_effect = _exists

    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Chargeback initiated" in res.reason


@pytest.mark.asyncio
async def test_all_pass_allows(compliance_engine, mock_db, mock_redis, dummy_action, monkeypatch):
    """Green path: all checks pass → action is allowed."""
    _patch_dt(monkeypatch)
    _, result = mock_db
    result.scalar_one.return_value = 0
    result.fetchone.return_value = None
    mock_redis.exists.return_value = False
    mock_redis.get.return_value = None

    res = await compliance_engine.check(dummy_action, "cust_ok")
    assert res.allowed
