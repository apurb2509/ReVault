"""
Module 3: Subscription Rescue Agent
Classifies subscription failure cause before the native T+1 retry fires.
Selects a cause-specific recovery strategy and initiates the win-back sequence.
"""
import json
import logging
from datetime import date, datetime, timezone, timedelta

from models.payment_event import FailureCause
from services.salary_predictor import next_salary_date
from tools.payment_links import create_recovery_link
from tools.whatsapp_sender import send_whatsapp_template
from agents.graph import AgentState

logger = logging.getLogger(__name__)

# Win-back sequence schedule: (day_offset, channel, message_key)
WIN_BACK_SEQUENCE = [
    (0, "whatsapp", "subscription_halted_day0"),
    (2, "whatsapp", "subscription_halted_day2_hinglish"),
    (5, "voice",    "subscription_halted_day5_voice"),
    (7, "hitl",     "subscription_halted_day7_human"),
    (10, "whatsapp", "subscription_halted_day10_final_offer"),
    # STOP: no further contact after day 10
]


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))
    cause = event.failure_cause or FailureCause.UNKNOWN

    subscription_id = event.subscription_id or _extract_subscription_id(event.raw_payload)
    customer = _extract_customer(event.raw_payload)
    amount = event.amount or 0

    if not subscription_id:
        logger.warning("Subscription Rescue: missing subscription_id for event %s", event.id)
        return {**state, "recovery_actions_taken": actions_taken}

    action = await _select_recovery_action(cause, customer, amount, subscription_id)
    if action:
        actions_taken.append(action)

    return {**state, "recovery_actions_taken": actions_taken}


async def _select_recovery_action(
    cause: FailureCause,
    customer: dict,
    amount: int,
    subscription_id: str,
) -> dict | None:
    """
    Routes to the appropriate recovery strategy based on failure cause.
    Returns a dict describing the action taken.
    """
    phone = customer.get("contact", "")
    name = customer.get("name", "Customer")

    match cause:
        case FailureCause.BANK_INFRA_DOWN:
            # Wait 2 hours, then check if bank recovered — handled by retry scheduler
            logger.info("Subscription %s: BANK_INFRA_DOWN — scheduling 2hr retry", subscription_id)
            return {"module": "SUBSCRIPTION_RESCUE", "action": "RETRY_SCHEDULED", "delay_hours": 2, "cause": cause}

        case FailureCause.INSUFFICIENT_FUNDS:
            historical_dates = []
            from db.supabase_client import supabase
            contact = customer.get("contact")
            if supabase and contact:
                try:
                    res = supabase.table("payment_events").select("received_at")\
                        .eq("event_type", "payment.captured")\
                        .eq("raw_payload->payload->payment->entity->>contact", contact)\
                        .execute()
                    if res.data:
                        from datetime import datetime
                        historical_dates = [datetime.fromisoformat(row["received_at"]).date() for row in res.data]
                except Exception as e:
                    logger.error("Failed to fetch historical dates: %s", e)

            # Target salary day for retry — more likely to have funds
            predicted_date = next_salary_date(historical_dates)
            date_str = predicted_date.isoformat() if predicted_date else "1st of next month"
            logger.info("Subscription %s: INSUFFICIENT_FUNDS — targeting salary day %s", subscription_id, date_str)
            return {
                "module": "SUBSCRIPTION_RESCUE",
                "action": "RETRY_SCHEDULED",
                "retry_date": date_str,
                "cause": cause,
            }

        case FailureCause.CARD_EXPIRED | FailureCause.CARD_ISSUER_BLOCK:
            if phone:
                await send_whatsapp_template(
                    to_phone=phone,
                    template_name="card_update_required",
                    language_code="en",
                    components=[{"type": "body", "parameters": [{"type": "text", "text": name}]}],
                )
            return {"module": "SUBSCRIPTION_RESCUE", "action": "CARD_UPDATE_LINK_SENT", "cause": cause}

        case FailureCause.UPI_LIMIT_EXCEEDED | FailureCause.MANDATE_CANCELLED:
            if phone:
                link = await create_recovery_link(
                    order_id=subscription_id,
                    amount=amount,
                    customer_name=name,
                    customer_email=customer.get("email", ""),
                    customer_phone=phone,
                    description=f"Complete your subscription payment — alternative method",
                )
                return {"module": "SUBSCRIPTION_RESCUE", "action": "ALTERNATIVE_LINK_SENT", "link": link.short_url, "cause": cause}

        case _:
            # Halted subscription — activate full win-back sequence starting Day 0.
            # Write a Redis tracking key so the SequenceScheduler fires Day 2/5/7/10 steps.
            logger.info("Subscription %s: activating win-back sequence", subscription_id)

            try:
                from config import get_settings
                import redis.asyncio as aioredis
                redis_client = aioredis.from_url(get_settings().redis_url, ssl_cert_reqs="none")
                winback_state = {
                    "subscription_id": subscription_id,
                    "amount": amount,
                    "customer_phone": phone,
                    "customer_name": name,
                    "step_index": 0,   # 0 = Day 2 (first deferred step after Day 0)
                    "next_fire_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
                }
                await redis_client.set(
                    f"revault:winback_seq:{subscription_id}",
                    json.dumps(winback_state),
                    ex=86_400 * 15,  # TTL 15 days — covers Day 0–10 + buffer
                )
                await redis_client.aclose()
                logger.info("Win-back sequence tracking key written for sub %s", subscription_id)
            except Exception as seq_exc:
                logger.warning("Failed to write win-back sequence key (non-fatal): %s", seq_exc)

            return {"module": "SUBSCRIPTION_RESCUE", "action": "WIN_BACK_INITIATED", "cause": cause}

    return None


def _extract_subscription_id(raw_payload: dict) -> str | None:
    try:
        return raw_payload["payload"]["subscription"]["entity"]["id"]
    except (KeyError, TypeError):
        return None


def _extract_customer(raw_payload: dict) -> dict:
    try:
        return raw_payload["payload"]["payment"]["entity"].get("customer", {}) or {}
    except (KeyError, TypeError):
        return {}
