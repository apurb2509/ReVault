from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
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
    # This is a highly simplified runner that directly executes a recovery agent
    # for the pitch demo, showcasing a true live execution.
    
    if req.event_type == "payment.failed":
        if req.failure_cause == "INSUFFICIENT_FUNDS":
            # Direct to WhatsApp
            from tools.whatsapp_sender import send_whatsapp_text
            msg = f"Namaste {req.customer_name}, aapka ₹{req.amount/100:.2f} ka payment fail ho gaya hai (Insufficient Funds). Kripya account fund karein ya link se pay karein."
            await send_whatsapp_text(req.phone_number, msg)
            logger.info("Live WhatsApp triggered for Insufficient Funds.")
            
        elif req.failure_cause == "HIGH_VALUE_DEFAULT":
            # Direct to Voice Agent
            from agents.voice_agent import VoiceAgent
            agent = VoiceAgent()
            script_data = await agent.generate_script(req.customer_name, req.amount, "High value payment failure")
            await agent.initiate_call(req.customer_name, req.phone_number, script_data["script"])
            logger.info("Live Outbound Call triggered for High Value Default.")
            
@router.post("/trigger")
async def trigger_live_event(req: TriggerEventRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Triggers a live event. Runs the processing in the background to not block the API.
    """
    background_tasks.add_task(process_realtime_event, req, db)
    return {"status": "Event received and processing initiated"}
