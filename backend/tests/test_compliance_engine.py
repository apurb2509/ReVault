import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from services.compliance_engine import ComplianceEngine, CheckResult
from models.recovery_action import RecoveryAction
from config import get_settings

settings = get_settings()

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_redis():
    return AsyncMock()

@pytest.fixture
def mock_audit():
    return AsyncMock()

@pytest.fixture
def compliance_engine(mock_db, mock_redis, mock_audit):
    return ComplianceEngine(mock_db, mock_redis, mock_audit)

@pytest.fixture
def dummy_action():
    return RecoveryAction(
        id=uuid.uuid4(),
        event_id=uuid.uuid4(),
        module="TEST_MODULE",
        action_type="TEST_ACTION",
        channel="SYSTEM",
        payload={},
        agent_reasoning="test",
        outcome="PENDING",
        amount_recovered=0
    )

@pytest.mark.asyncio
async def test_opt_out_blocks(compliance_engine, mock_redis, dummy_action):
    mock_redis.exists.return_value = True
    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "opted out" in res.reason

@pytest.mark.asyncio
async def test_time_window_blocks(compliance_engine, dummy_action, monkeypatch):
    # Force a time outside 9 AM - 9 PM IST. Let's pick 3 AM IST.
    class MockDatetime:
        @classmethod
        def now(cls, tz):
            return datetime(2026, 1, 1, 21, 30, tzinfo=timezone.utc) # 21:30 UTC = 3:00 AM IST

    monkeypatch.setattr("services.compliance_engine.datetime", MockDatetime)
    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "outside" in res.reason

@pytest.mark.asyncio
async def test_max_attempts_blocks(compliance_engine, mock_db, dummy_action):
    mock_db.execute.return_value.scalar_one.return_value = settings.max_recovery_attempts
    # Need to make sure other redis checks pass
    compliance_engine._redis.exists.return_value = False
    compliance_engine._redis.get.return_value = None
    
    # We must patch time window to pass
    class MockDatetimePass:
        @classmethod
        def now(cls, tz):
            return datetime(2026, 1, 1, 6, 30, tzinfo=timezone.utc) # 12:00 PM IST
        @classmethod
        def utcnow(cls):
            return datetime(2026, 1, 1, 6, 30)

    import services.compliance_engine
    services.compliance_engine.datetime = MockDatetimePass

    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Max recovery attempts" in res.reason

@pytest.mark.asyncio
async def test_fraud_flag_blocks(compliance_engine, mock_db, mock_redis, dummy_action):
    # Setup mocks to pass everything until fraud flag
    mock_redis.exists.return_value = False
    mock_redis.get.return_value = None
    mock_db.execute.return_value.scalar_one.return_value = 0 # Max attempts pass

    class MockDatetimePass:
        @classmethod
        def now(cls, tz):
            return datetime(2026, 1, 1, 6, 30, tzinfo=timezone.utc)
        @classmethod
        def utcnow(cls):
            return datetime(2026, 1, 1, 6, 30)

    import services.compliance_engine
    services.compliance_engine.datetime = MockDatetimePass
    
    # Fraud flag mock
    mock_row = MagicMock()
    mock_row.__getitem__.return_value = "FRAUD_SUSPECTED"
    mock_db.execute.return_value.fetchone.return_value = mock_row

    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Fraud-suspected" in res.reason

@pytest.mark.asyncio
async def test_chargeback_blocks(compliance_engine, mock_redis, dummy_action):
    # Mock exists to only return True for chargeback key
    async def mock_exists(key):
        return "chargeback" in key
    mock_redis.exists.side_effect = mock_exists
    
    res = await compliance_engine.check(dummy_action, "cust_1")
    assert not res.allowed
    assert "Chargeback initiated" in res.reason
