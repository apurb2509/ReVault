import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from db.database import get_db
from models.payment_event import EventType, PaymentEvent, FailureCause
from services.webhook_handler import parse_webhook, extract_event_id, WebhookVerificationError
from services.compliance_engine import ComplianceEngine
from services.audit_logger import AuditLogger
from agents.graph import compiled_graph, AgentState
from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/razorpay", tags=["webhooks"])
settings = get_settings()

redis_client = aioredis.from_url(settings.redis_url)


@router.post("")
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Ingests webhooks from Razorpay, verifies signatures, ensures idempotency,
    and kicks off the LangGraph agent in the background.
    """
    try:
        payload = await parse_webhook(request)
    except WebhookVerificationError as exc:
        logger.warning("Webhook verification failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))

    event_id = extract_event_id(payload)
    event_type_str = payload.get("event")

    # Idempotency check via Redis
    idem_key = f"revault:webhook:{event_id}"
    if await redis_client.setnx(idem_key, "1"):
        await redis_client.expire(idem_key, 86400 * 7) # 7 days
    else:
        logger.info("Ignoring duplicate webhook event: %s", event_id)
        return {"status": "ok", "message": "duplicate"}

    try:
        event_type = EventType(event_type_str)
    except ValueError:
        logger.info("Ignoring unhandled event type: %s", event_type_str)
        return {"status": "ok"}

    # Extract common fields
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
    sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})

    amount = payment_entity.get("amount") or order_entity.get("amount")

    # Basic mapping of error reasons to failure causes
    cause = FailureCause.UNKNOWN
    if event_type == EventType.PAYMENT_FAILED:
        err_code = payment_entity.get("error_code")
        err_reason = payment_entity.get("error_reason", "").lower()
        if "fund" in err_reason or err_code == "BAD_REQUEST_ERROR":
            cause = FailureCause.INSUFFICIENT_FUNDS
        elif "bank" in err_reason or err_code == "GATEWAY_ERROR":
            cause = FailureCause.BANK_INFRA_DOWN

    event = PaymentEvent(
        razorpay_event_id=event_id,
        event_type=event_type,
        payment_id=payment_entity.get("id"),
        order_id=order_entity.get("id"),
        subscription_id=sub_entity.get("id"),
        amount=amount,
        failure_cause=cause,
        raw_payload=payload,
    )

    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Hand off to background worker for AI processing so webhook returns 200 OK immediately
    background_tasks.add_task(process_event_graph, event, db)

    return {"status": "ok"}


async def process_event_graph(event: PaymentEvent, db: AsyncSession) -> None:
    logger.info("Starting agent graph for event %s", event.id)
    audit = AuditLogger(db)
    compliance = ComplianceEngine(db, redis_client, audit)

    customer_id = event.raw_payload.get("payload", {}).get("payment", {}).get("entity", {}).get("customer_id", "unknown")

    initial_state: AgentState = {
        "event": event,
        "customer_id": customer_id,
        "merchant_id": "default",
        "active_modules": [],
        "rca_result": None,
        "recovery_actions_taken": [],
        "compliance_blocks": [],
        "ptp_created": None,
        "voice_script": None,
        "advisory": None,
        "escalated": False,
        "recovered": False,
        "error": None,
    }

    try:
        # Run the LangGraph state machine
        final_state = await compiled_graph.ainvoke(initial_state)

        # ── payment.captured: close all open recovery actions for this order ───────
        # When a real Razorpay payment.captured event arrives, we look up any PENDING
        # recovery actions tied to the same order_id and mark them PAYMENT_MADE.
        # This is the production counterpart of the batch simulation in redis_worker.
        if event.event_type == EventType.PAYMENT_CAPTURED and event.order_id:
            try:
                from sqlalchemy import text as sqla_text
                rows = await db.execute(
                    sqla_text("""
                        UPDATE recovery_actions
                        SET outcome = 'PAYMENT_MADE',
                            amount_recovered = :amount,
                            outcome_recorded_at = NOW()
                        WHERE outcome = 'PENDING'
                          AND event_id IN (
                              SELECT id FROM payment_events
                              WHERE order_id = :order_id
                                AND event_type != 'payment.captured'
                          )
                        RETURNING id
                    """),
                    {"amount": event.amount or 0, "order_id": event.order_id},
                )
                resolved_ids = rows.fetchall()
                await db.commit()
                if resolved_ids:
                    logger.info(
                        "payment.captured webhook closed %d recovery action(s) for order %s — amount: \u20b9%.2f",
                        len(resolved_ids),
                        event.order_id,
                        (event.amount or 0) / 100,
                    )
                    # Write audit entry for the resolution
                    try:
                        supabase_audit_entry = {
                            "module": "WEBHOOK_HANDLER",
                            "actor": "RAZORPAY",
                            "event_id": str(event.id),
                            "decision_log": json.dumps({
                                "action": "RECOVERY_LOOP_CLOSED",
                                "order_id": event.order_id,
                                "resolved_action_count": len(resolved_ids),
                                "amount_recovered": event.amount or 0,
                            }),
                            "compliance_log": json.dumps({"allowed": True, "reason": "Real payment.captured event closed recovery loop."}),
                        }
                        from db.supabase_client import supabase
                        if supabase:
                            supabase.table("audit_trail").insert(supabase_audit_entry).execute()
                    except Exception as audit_exc:
                        logger.warning("Failed to write capture-resolution audit entry: %s", audit_exc)
            except Exception as cap_exc:
                logger.error("Failed to resolve recovery actions on capture for order %s: %s", event.order_id, cap_exc)
        # ──────────────────────────────────────────────────────────────────────────

        # Log final recovery actions and execute them
        for action_dict in final_state.get("recovery_actions_taken", []):
            module = action_dict.get("module", "UNKNOWN")
            action_type = action_dict.get("action", "UNKNOWN")

            # Check compliance rules before we conceptually "execute"
            from models.recovery_action import RecoveryAction, RecoveryModule, ActionType
            try:
                rec_module = RecoveryModule(module)
            except ValueError:
                rec_module = RecoveryModule.COMPLIANCE_ENGINE
            
            try:
                rec_action_type = ActionType(action_type)
            except ValueError:
                rec_action_type = ActionType.COMPLIANCE_BLOCKED

            action_record = RecoveryAction(
                event_id=event.id,
                module=rec_module,
                action_type=rec_action_type,
                payload=action_dict,
                agent_reasoning=json.dumps(final_state.get("rca_result") or action_dict)
            )

            compliance_res = await compliance.check(action_record, customer_id)
            if compliance_res.allowed:
                db.add(action_record)
                await db.commit()
                await db.refresh(action_record)
                await audit.log_action(action_record, action_dict)
                await compliance.record_contact(customer_id)
                
                # The frontend now subscribes directly to Supabase Realtime
                pass

    except Exception:
        logger.exception("Failed to process event %s through graph", event.id)


from pydantic import BaseModel

class SimulateReplyRequest(BaseModel):
    customer_phone: str
    message: str

@router.post("/simulate-reply")
async def simulate_incoming_reply(
    req: SimulateReplyRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    from agents.ptp_tracker import process_incoming_reply
    await process_incoming_reply(req.customer_phone, req.message, db)
    return {"status": "ok", "message": "Reply processed"}
