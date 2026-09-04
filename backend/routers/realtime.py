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


class VoiceTriggerRequest(BaseModel):
    customer_name: str
    amount: int  # in paise
    failure_cause: str = "INSUFFICIENT_FUNDS"


@router.post("/trigger-voice")
async def trigger_voice_call(req: VoiceTriggerRequest, db: AsyncSession = Depends(get_db)):
    """
    Places a REAL Twilio outbound Hinglish voice call.
    1. Generates a personalized Hinglish script via Gemini VoiceAgent.
    2. Synthesizes audio via ElevenLabs / gTTS.
    3. Initiates a live Twilio outbound call to YOUR_PERSONAL_PHONE_NUMBER.
    """
    from agents.voice_agent import VoiceAgent
    from config import get_settings
    settings = get_settings()

    agent = VoiceAgent()
    event_id = str(uuid.uuid4())

    logger.info(
        "VoiceIQ trigger: customer=%s, amount=%s paise, cause=%s",
        req.customer_name, req.amount, req.failure_cause,
    )

    # Step 1 — Generate Hinglish script
    script_data = await agent.generate_script(
        name=req.customer_name,
        amount=req.amount,
        reason=req.failure_cause,
        contact_history="First contact — demo trigger",
    )
    script = script_data.get("script", "")
    logger.info("VoiceIQ script generated: %s", script[:80])

    # Step 2 — Place the real Twilio call
    called = await agent.initiate_call(
        customer_name=req.customer_name,
        phone=settings.your_personal_phone_number,
        script=script,
        event_id=event_id,
    )

    # Step 3 — Log to DB so the Live Feed updates in the dashboard
    action_id = str(uuid.uuid4())
    executed_at = datetime.utcnow()
    payload_str = json.dumps({"event": "payment.failed", "customer": req.customer_name})
    try:
        await db.execute(
            text("""
                INSERT INTO payment_events
                (id, razorpay_event_id, event_type, payment_id, order_id, amount, failure_cause, raw_payload)
                VALUES (:id, :rzp_id, :event_type, :pay_id, :order_id, :amount, :failure_cause, :payload)
            """),
            {
                "id": event_id,
                "rzp_id": f"evt_voice_{event_id[:8]}",
                "event_type": "payment.failed",
                "pay_id": f"pay_{event_id[:8]}",
                "order_id": f"order_{event_id[:8]}",
                "amount": req.amount,
                "failure_cause": req.failure_cause,
                "payload": payload_str,
            },
        )
        await db.execute(
            text("""
                INSERT INTO recovery_actions
                (id, event_id, module, action_type, channel, payload, agent_reasoning, outcome, executed_at)
                VALUES (:id, :event_id, 'VOICE_AGENT', 'VOICE_CALL_TRIGGERED', 'VOICE',
                        :script_payload, :reasoning, 'PENDING', :executed_at)
            """),
            {
                "id": action_id,
                "event_id": event_id,
                "script_payload": json.dumps({"script": script, "tone": script_data.get("tone", "warm")}),
                "reasoning": json.dumps({
                    "customer": req.customer_name,
                    "twilio_call_placed": called,
                    "script_preview": script[:100],
                }),
                "executed_at": executed_at,
            },
        )
        await db.commit()
    except Exception as e:
        logger.error("Failed to log voice call to DB: %s", e)

    if called:
        return {
            "status": "call_initiated",
            "message": f"Twilio outbound call placed to {settings.your_personal_phone_number}. Phone should ring in 5-10 seconds.",
            "script_preview": script[:120],
        }
    else:
        return {
            "status": "call_failed",
            "message": "Twilio call could not be placed. Check TWILIO credentials and NGROK_PUBLIC_URL in .env.",
            "script_preview": script[:120],
        }

