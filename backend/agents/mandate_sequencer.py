"""
Module 5: Intelligent Mandate Retry Sequencer
Handles dynamic retry scheduling based on cause, switching rails between attempts.
"""
import logging

from services.retry_scheduler import RetryScheduler, RetryStatus
from models.payment_event import FailureCause
from tools.payment_links import create_recovery_link
from tools.whatsapp_sender import send_whatsapp_template
from agents.graph import AgentState

logger = logging.getLogger(__name__)


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))
    cause = event.failure_cause or FailureCause.UNKNOWN

    payment_id = event.payment_id
    if not payment_id:
        logger.warning("Mandate Sequencer: missing payment_id for event %s", event.id)
        return {**state, "recovery_actions_taken": actions_taken}

    # In a full app, this would be injected or pulled from request scope
    from config import get_settings
    import redis.asyncio as aioredis
    redis_client = aioredis.from_url(get_settings().redis_url)
    scheduler = RetryScheduler(redis_client)

    retry_state = await scheduler.get(event.id)

    if not retry_state:
        # First failure — initialize state machine
        retry_state = await scheduler.create(event.id, payment_id, cause)
        logger.info("Mandate Sequencer: initialized retry state for payment %s", payment_id)
        actions_taken.append({
            "module": "MANDATE_SEQUENCER",
            "action": "INITIALIZED",
            "next_retry_at": retry_state.next_retry_at.isoformat(),
            "rail": retry_state.retry_rail.value,
        })
    else:
        # Subsequent failure on retry — advance state machine
        new_state = await scheduler.advance(event.id, cause)
        if new_state:
            logger.info("Mandate Sequencer: advanced retry for payment %s to attempt %d", payment_id, new_state.attempt_count)
            actions_taken.append({
                "module": "MANDATE_SEQUENCER",
                "action": "ADVANCED",
                "attempt": new_state.attempt_count,
                "next_retry_at": new_state.next_retry_at.isoformat(),
                "rail": new_state.retry_rail.value,
            })
        else:
            logger.warning("Mandate Sequencer: max attempts reached for payment %s", payment_id)
            actions_taken.append({
                "module": "MANDATE_SEQUENCER",
                "action": "MAX_ATTEMPTS_REACHED",
                "escalated": True,
            })

    await redis_client.aclose()
    return {**state, "recovery_actions_taken": actions_taken}
