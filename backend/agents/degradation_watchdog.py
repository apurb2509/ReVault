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
    from db.supabase_client import supabase
    if not supabase:
        return "Supabase client not initialized."
    
    try:
        from datetime import datetime, timedelta
        twenty_four_hours_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        
        res_captured = supabase.table("payment_events").select("id", count="exact").eq("event_type", "payment.captured").gte("received_at", twenty_four_hours_ago).execute()
        res_failed = supabase.table("payment_events").select("id", count="exact").eq("event_type", "payment.failed").gte("received_at", twenty_four_hours_ago).execute()
        
        captured_count = res_captured.count or 0
        failed_count = res_failed.count or 0
        total = captured_count + failed_count
        
        overall_success_rate = (captured_count / total * 100) if total > 0 else 100.0
        
        return f"24hr success rate across all methods: {overall_success_rate:.1f}%\n(Real-time metrics from Supabase)"
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Failed to fetch live baseline: %s", e)
        return "Error fetching live baseline from DB."
