from fastapi import APIRouter, Request, BackgroundTasks, Form
from fastapi.responses import PlainTextResponse, FileResponse
import os
import uuid
import logging
from config import get_settings
from twilio.twiml.voice_response import VoiceResponse

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/twilio", tags=["twilio"])

@router.post("/twiml")
async def twilio_twiml(request: Request):
    """
    Twilio hits this endpoint when the user picks up the phone.
    We need to return TwiML that tells Twilio what to do.
    We will tell it to <Play> the synthesized audio.
    """
    # The script to synthesize should be passed as a query parameter when we initiated the call
    script = request.query_params.get("script", "Hello, this is ReVault calling.")
    customer_name = request.query_params.get("customer", "Customer")
    
    # We will point the <Play> verb to another endpoint that actually returns the MP3
    ngrok_url = settings.ngrok_public_url.rstrip("/")
    if not ngrok_url:
        ngrok_url = "http://localhost:8000" # fallback, but Twilio needs public
        
    from urllib.parse import quote
    play_url = f"{ngrok_url}/api/twilio/play_audio?script={quote(script)}&customer={quote(customer_name)}"
    
    response = VoiceResponse()
    response.play(play_url)
    
    return PlainTextResponse(str(response), media_type="text/xml")

@router.get("/play_audio")
async def play_audio(script: str, customer: str):
    """
    Generates ElevenLabs audio on the fly (or gTTS fallback) and returns it to Twilio.
    """
    from tools.voice_synthesizer import synthesize_hinglish
    result = await synthesize_hinglish(script, customer)
    
    return FileResponse(
        path=result.file_path, 
        media_type="audio/mpeg"
    )

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from db.database import get_db
from twilio.twiml.messaging_response import MessagingResponse

@router.post("/whatsapp")
async def twilio_whatsapp(
    From: str = Form(...),
    Body: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Twilio hits this endpoint when a user replies to the AI's WhatsApp message.
    We pass the message to the PTP (Promise-to-Pay) Tracker NLP engine.
    """
    logger.info(f"LIVE WhatsApp Reply received from {From}: {Body}")
    
    # Twilio sends From as "whatsapp:+1234567890"
    customer_phone = From.replace("whatsapp:", "")
    
    from agents.ptp_tracker import process_incoming_reply
    await process_incoming_reply(customer_phone, Body, db)
    
    # Twilio requires valid TwiML response, even an empty one
    resp = MessagingResponse()
    return PlainTextResponse(str(resp), media_type="text/xml")

