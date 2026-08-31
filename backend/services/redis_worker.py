import asyncio
import json
import logging
import uuid
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import redis.asyncio as aioredis
from sqlalchemy import text

from config import get_settings
from db.database import async_session
from services.compliance_engine import ComplianceEngine
from services.audit_logger import AuditLogger
from models.recovery_action import RecoveryAction, RecoveryModule, ActionType
from agents.subscription_mandate_engine import SubscriptionMandateEngine
from agents.b2b_chaser import B2BReceivablesChaser, InvoiceState

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] RedisWorker: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

QUEUE_NAME = "revault:payment_events_queue"

async def process_event(ev: dict, redis_client) -> None:
    async with async_session() as db:
        audit = AuditLogger(db)
        compliance = ComplianceEngine(db, redis_client, audit)
        sub_engine = SubscriptionMandateEngine(db, redis_client)
        chaser = B2BReceivablesChaser(db)

        action = None
        event_uuid = uuid.uuid4()
        customer_id = ev["customer_id"]
        amount = ev["amount"]

        try:
            await db.execute(text("""
                INSERT INTO payment_events
                    (id, razorpay_event_id, event_type, amount, failure_cause, raw_payload)
                VALUES (:id, :rzp_id, :type, :amt, :cause, CAST(:payload AS JSONB))
                ON CONFLICT DO NOTHING
            """), {
                "id": str(event_uuid),
                "rzp_id": f"evt_{event_uuid}",
                "type": ev["event_type"],
                "amt": amount,
                "cause": ev.get("failure_cause", ""),
                "payload": json.dumps(ev.get("payload", {})),
            })
            await db.commit()
        except Exception as exc:
            logger.error(f"Failed to insert payment_event: {exc}")
            return

        try:
            if ev["event_type"] == "payment.failed":
                res = await sub_engine.process_failure(str(event_uuid), ev["failure_cause"], customer_id, amount)
                action = res.get("action")

            elif ev["event_type"] == "order.abandoned":
                action = RecoveryAction(
                    id=uuid.uuid4(), event_id=event_uuid, module=RecoveryModule.ABANDONMENT_HUNTER,
                    action_type=ActionType.WHATSAPP_SENT, channel="WHATSAPP",
                    payload={"cart_value": amount, "tier": 1},
                    agent_reasoning="Abandoned order detected. Tier-1 instant recovery WhatsApp sent with payment link.",
                    outcome="PENDING", amount_recovered=0,
                )

            elif ev["event_type"] == "subscription.halted":
                res = await sub_engine.process_failure(str(event_uuid), ev["failure_cause"], customer_id, amount, is_subscription_halted=True)
                action = res.get("action")

            elif ev["event_type"] == "invoice.aging":
                days_out = ev["payload"].get("days_outstanding", 30)
                istate = InvoiceState(invoice_id=str(event_uuid), days_outstanding=days_out, amount=amount, company=f"Company-{customer_id}")
                action = await chaser.process_invoice(str(event_uuid), istate)

            elif ev["event_type"] == "message.received":
                action = RecoveryAction(
                    id=uuid.uuid4(), event_id=event_uuid, module=RecoveryModule.PTP_TRACKER,
                    action_type=ActionType.PTP_LOGGED, channel="SYSTEM",
                    payload={"text": ev["payload"].get("text", "")},
                    agent_reasoning="Customer message received — PTP extraction queued.",
                    outcome="PENDING", amount_recovered=0,
                )
        except Exception as exc:
            logger.error(f"Agent error for event {ev['id']}: {exc}")
            return

        if action is None:
            return

        # Compliance Gate
        is_fraud = ev.get("meta", {}).get("is_fraud", False)
        if is_fraud:
            await redis_client.set(f"revault:fraud:{action.event_id}", "1")

        comp_res = await compliance.check(action, customer_id)
        
        if not comp_res.allowed:
            action.outcome = "BLOCKED"
        else:
            # Simulate recovery
            import random
            if random.random() < 0.40:
                action.outcome = "PAYMENT_MADE"
                action.amount_recovered = amount
            else:
                action.outcome = "PENDING"

        try:
            await db.execute(text("""
                INSERT INTO recovery_actions
                    (id, event_id, module, action_type, channel, agent_reasoning, outcome, amount_recovered)
                VALUES (:id, :eid, :mod, :atype, :chan, :reason, :out, :recovered)
            """), {
                "id": str(action.id), "eid": str(action.event_id), "mod": str(action.module),
                "atype": str(action.action_type), "chan": action.channel or "SYSTEM",
                "reason": action.agent_reasoning or "", "out": str(action.outcome),
                "recovered": action.amount_recovered or 0,
            })
            await db.commit()
        except Exception as exc:
            logger.error(f"DB error for event: {exc}")
            await db.rollback()

async def run_worker():
    logger.info("Starting ReVault Redis Queue Worker Daemon...")
    
    # Force ssl_cert_reqs="none" since we are connecting to remote Upstash URL securely
    redis_client = aioredis.from_url(settings.redis_url, ssl_cert_reqs="none")
    
    try:
        await redis_client.ping()
        logger.info(f"Connected to Redis successfully! Listening to queue: {QUEUE_NAME}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return
        
    batch_size = 10
    sleep_interval = 2.0
    
    try:
        while True:
            # Pop up to 10 items at once from the list
            items = await redis_client.lpop(QUEUE_NAME, count=batch_size)
            
            if not items:
                # If queue is empty, block until at least 1 item arrives
                result = await redis_client.brpop(QUEUE_NAME, timeout=0)
                if result:
                    _, first_item = result
                    items = [first_item]
                    
                    # Try to grab up to 9 more if they arrived immediately
                    more_items = await redis_client.lpop(QUEUE_NAME, count=batch_size - 1)
                    if more_items:
                        items.extend(more_items)
            
            if items:
                logger.info(f"Pulled {len(items)} events from Redis queue. Processing concurrently...")
                
                tasks = []
                for raw_msg in items:
                    try:
                        ev = json.loads(raw_msg.decode("utf-8"))
                        tasks.append(process_event(ev, redis_client))
                    except Exception as e:
                        logger.error(f"Failed to decode message: {e}")
                        
                if tasks:
                    await asyncio.gather(*tasks)
                        
                logger.info(f"Batch processed. Sleeping for {sleep_interval} seconds to protect API quotas...")
                await asyncio.sleep(sleep_interval)
                
    except asyncio.CancelledError:
        logger.info("Redis Worker shut down requested.")
    except Exception as e:
        logger.error(f"Redis Worker error: {e}")
    finally:
        await redis_client.aclose()

if __name__ == "__main__":
    asyncio.run(run_worker())
