"""
Module 1: Payment Degradation Watchdog
Detects bank/method success rate drops, runs Gemini RCA, generates merchant advisory.
"""
import logging
from datetime import datetime, timedelta

from tools.gemini_client import RCA_PROMPT, call_gemini
from agents.graph import AgentState

logger = logging.getLogger(__name__)


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    failure_summary = _build_failure_summary(event)
    baseline_metrics = _build_baseline_stub()

    prompt = RCA_PROMPT.format(
        failure_summary=failure_summary,
        baseline_metrics=baseline_metrics,
    )

    try:
        rca = await call_gemini(prompt)
    except Exception:
        logger.exception("RCA engine failed for event %s", event.id)
        rca = {
            "root_cause": "UNKNOWN",
            "confidence": 0.0,
            "merchant_advisory": "Unable to diagnose root cause — please review manually.",
            "auto_action_permitted": False,
        }

    logger.info(
        "RCA result for event %s: %s (confidence %.2f)",
        event.id,
        rca.get("root_cause"),
        rca.get("confidence", 0),
    )

    advisory = rca.get("merchant_advisory", "")
    return {
        **state,
        "rca_result": rca,
        "advisory": advisory,
    }


def _build_failure_summary(event) -> str:
    return (
        f"Payment ID: {event.payment_id}\n"
        f"Amount: ₹{(event.amount or 0) / 100:.2f}\n"
        f"Failure cause (raw): {event.failure_cause}\n"
        f"Received at: {event.received_at.isoformat()}\n"
        f"Raw payload excerpt: {str(event.raw_payload)[:500]}"
    )


def _build_baseline_stub() -> str:
    # In production this pulls real 24hr aggregates from the DB/TimescaleDB
    return (
        "24hr success rate across all methods: 94.2%\n"
        "SBI UPI 24hr success rate: 91.5%\n"
        "HDFC Card 24hr success rate: 96.8%"
    )
