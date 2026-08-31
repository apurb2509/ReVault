import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["realtime"])

class TriggerEventRequest(BaseModel):
    event_type: str
    customer_name: str
    phone_number: str
    amount: int
    failure_cause: str

async def process_realtime_event(req: TriggerEventRequest, db: AsyncSession):
    event_id = str(uuid.uuid4())
    action_id = str(uuid.uuid4())
    
    # 1. Insert into payment_events
    payload_str = json.dumps({"event": req.event_type, "customer": req.customer_name})
    await db.execute(
        text("""
            INSERT INTO payment_events 
            (id, razorpay_event_id, event_type, payment_id, order_id, amount, failure_cause, raw_payload)
            VALUES (:id, :rzp_id, :event_type, :pay_id, :order_id, :amount, :failure_cause, :payload)
        """),
        {
            "id": event_id,
            "rzp_id": f"evt_demo_{event_id[:8]}",
            "event_type": req.event_type,
            "pay_id": f"pay_{event_id[:8]}",
            "order_id": f"order_{event_id[:8]}",
            "amount": req.amount,
            "failure_cause": req.failure_cause,
            "payload": payload_str
        }
    )
    
    # Determine which agent module handled it based on failure cause
    module = "COMPLIANCE_ENGINE"
    action_type = "UNKNOWN"
    reasoning = "{}"
    outcome = "PENDING"
    
    if req.failure_cause == "BANK_INFRA_DOWN":
        module = "DEGRADATION_WATCHDOG"
        action_type = "PAYMENT_LINK_SENT"
        reasoning = '{"reason": "HDFC Down. Sent alternate UPI link."}'
    elif req.failure_cause == "INSUFFICIENT_FUNDS":
        module = "SUBSCRIPTION_RESCUE"
        action_type = "RETRY_SCHEDULED"
        reasoning = '{"reason": "Low balance. Deferred retry."}'
    elif req.failure_cause == "EXPIRED_CARD":
        module = "SUBSCRIPTION_RESCUE"
        action_type = "PAYMENT_LINK_SENT"
        reasoning = '{"reason": "Card expired. Sent update link."}'
    elif req.failure_cause == "MANDATE_AUTH_DROP":
        module = "MANDATE_SEQUENCER"
        action_type = "ALTERNATE_RAIL_ROUTED"
        reasoning = '{"reason": "e-NACH dropped. Rerouted to UPI."}'
        
    # 2. Insert into recovery_actions (this triggers Supabase Realtime!)
    executed_at = datetime.utcnow()
    await db.execute(
        text("""
            INSERT INTO recovery_actions 
            (id, event_id, module, action_type, channel, payload, agent_reasoning, outcome, executed_at)
            VALUES (:id, :event_id, :module, :action_type, 'WHATSAPP', '{}', :reasoning, :outcome, :executed_at)
        """),
        {
            "id": action_id,
            "event_id": event_id,
            "module": module,
            "action_type": action_type,
            "reasoning": reasoning,
            "outcome": outcome,
            "executed_at": executed_at
        }
    )
    
    await db.commit()
    logger.info(f"Simulated {req.failure_cause} event inserted into DB. Realtime feed should update.")

@router.post("/trigger")
async def trigger_live_event(req: TriggerEventRequest, db: AsyncSession = Depends(get_db)):
    """
    Triggers a live event and processes it synchronously so the DB session remains open.
    """
    await process_realtime_event(req, db)
    return {"status": "Event received and processing initiated"}
