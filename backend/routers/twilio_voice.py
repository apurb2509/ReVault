"""
Twilio Voice Router — ReVault Hinglish IVR
==========================================
Handles the full outbound voice call lifecycle with real DTMF IVR:

  POST /api/twilio/twiml
      Twilio calls this when the customer picks up.
      Returns TwiML that plays the Hinglish audio and then opens a
      <Gather> to capture DTMF keypresses:
        1 → Send WhatsApp payment link
        2 → Opt out of automated recovery
        3 → Send WhatsApp support message

  POST /api/twilio/dtmf
      Twilio calls this when the customer presses a key.
      Executes the corresponding action and returns a TwiML acknowledgement.

  GET  /api/twilio/play_audio
      Streams synthesized Hinglish MP3 back to Twilio for the <Play> verb.

  POST /api/twilio/whatsapp
      Incoming WhatsApp reply from customer → PTP extraction pipeline.
"""
from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import PlainTextResponse, FileResponse
from urllib.parse import quote, unquote
import logging

from config import get_settings
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.twiml.messaging_response import MessagingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


# ─────────────────────────────────────────────────────────────────
# Main TwiML entrypoint — play Hinglish audio + open IVR gather
# ─────────────────────────────────────────────────────────────────
@router.post("/twiml")
async def twilio_twiml(request: Request) -> PlainTextResponse:
    """
    Twilio calls this when the customer picks up.
    Plays the synthesized Hinglish script, then opens a <Gather> for IVR.
    The Hinglish script already ends with the IVR instructions:
      '...1 click karein, 2 dabayein, 3 dabayein...'
    <Gather> captures the DTMF digit and POSTs it to /api/twilio/dtmf.
    """
    script = request.query_params.get("script", "Namaste! Aapka payment pending hai. Kripya 1 dabayein.")
    customer_name = request.query_params.get("customer", "Customer")
    event_id = request.query_params.get("event_id", "")

    ngrok_url = settings.ngrok_public_url.rstrip("/")
    if not ngrok_url:
        ngrok_url = "http://localhost:8000"

    # URL for the MP3 audio stream
    play_url = (
        f"{ngrok_url}/api/twilio/play_audio"
        f"?script={quote(script)}&customer={quote(customer_name)}"
    )
    # URL for DTMF callback — pass event_id and customer name through
    dtmf_url = (
        f"{ngrok_url}/api/twilio/dtmf"
        f"?event_id={quote(event_id)}&customer={quote(customer_name)}&script={quote(script)}"
    )

    response = VoiceResponse()

    # <Gather> wraps <Play> so DTMF is captured at any point during playback
    # numDigits=1: capture a single keypress immediately
    # timeout=10: wait 10 seconds after audio ends for input
    gather = Gather(
        num_digits=1,
        action=dtmf_url,
        method="POST",
        timeout=10,
        finish_on_key="",   # Don't use # as terminator — single digit is enough
    )
    gather.play(play_url)
    response.append(gather)

    # Fallback if no key was pressed — politely end the call
    response.say(
        "Koi response nahi mila. Aapka din shubh ho! — ReVault Recovery Team.",
        language="hi-IN",
    )

    return PlainTextResponse(str(response), media_type="text/xml")


# ─────────────────────────────────────────────────────────────────
# DTMF handler — executes the action based on the digit pressed
# ─────────────────────────────────────────────────────────────────
@router.post("/dtmf")
async def twilio_dtmf(
    request: Request,
    Digits: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
) -> PlainTextResponse:
    """
    Receives the DTMF digit pressed by the customer and executes the action.
      1 → Send WhatsApp payment link
      2 → Opt out of automated recovery (sets Redis opt-out key)
      3 → Send WhatsApp support message
    Returns TwiML acknowledgement so Twilio plays a confirmation.
    """
    event_id = request.query_params.get("event_id", "")
    customer_name = unquote(request.query_params.get("customer", "Customer"))
    digit = Digits.strip()

    logger.info("DTMF received: digit=%s, customer=%s, event_id=%s", digit, customer_name, event_id)

    response = VoiceResponse()

    if digit == "1":
        # ── Send WhatsApp payment link ─────────────────────────────
        logger.info("IVR: Customer %s pressed 1 — sending WhatsApp payment link", customer_name)
        await _send_ivr_payment_link(event_id, customer_name, db)
        response.say(
            "Aapke WhatsApp pe payment link bhej diya gaya hai. Dhanyawaad! — ReVault.",
            language="hi-IN",
        )

    elif digit == "2":
        # ── Opt out — permanent Redis flag ────────────────────────
        logger.info("IVR: Customer %s pressed 2 — setting opt-out", customer_name)
        await _set_opt_out(event_id, customer_name)
        response.say(
            "Aap ko recovery calls se hata diya gaya hai. Koi pareshani ho toh humse sampark karein.",
            language="hi-IN",
        )

    elif digit == "3":
        # ── Send WhatsApp support message ─────────────────────────
        logger.info("IVR: Customer %s pressed 3 — sending WhatsApp support message", customer_name)
        await _send_ivr_support_message(event_id, customer_name, db)
        response.say(
            "Hum ne aapko WhatsApp pe support message bheja hai. Dhanyawaad!",
            language="hi-IN",
        )

    else:
        # Unrecognised digit
        logger.warning("IVR: Unrecognised DTMF digit '%s' from customer %s", digit, customer_name)
        response.say(
            "Galat input. Kripya 1, 2, ya 3 dabayein.",
            language="hi-IN",
        )

    return PlainTextResponse(str(response), media_type="text/xml")


# ─────────────────────────────────────────────────────────────────
# IVR action helpers
# ─────────────────────────────────────────────────────────────────
async def _send_ivr_payment_link(event_id: str, customer_name: str, db: AsyncSession) -> None:
    """Fetches the open payment event and sends a WhatsApp recovery link."""
    try:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT amount, raw_payload FROM payment_events WHERE id::text LIKE :prefix LIMIT 1"),
            {"prefix": f"{event_id[:8]}%"} if event_id else {"prefix": "%"},
        )
        row = result.fetchone()
        amount = row.amount if row else 99900
        raw_payload = row.raw_payload if row else {}

        customer = (
            raw_payload.get("payload", {}).get("payment", {}).get("entity", {}).get("customer", {}) or {}
        )
        phone = customer.get("contact", settings.your_personal_phone_number)
        email = customer.get("email", "")

        if not phone:
            logger.warning("IVR DTMF-1: no phone found for event %s, skipping link", event_id)
            return

        from tools.payment_links import create_recovery_link
        from tools.whatsapp_sender import send_whatsapp_text

        link = await create_recovery_link(
            order_id=event_id or "ivr_recovery",
            amount=amount,
            customer_name=customer_name,
            customer_email=email,
            customer_phone=phone,
            description="Complete your payment — IVR recovery",
        )
        body = (
            f"Hi {customer_name}! As requested during your call, here is your payment link: "
            f"{link.short_url}. Link expires in 24 hours. — ReVault Recovery Team 🙏"
        )
        await send_whatsapp_text(to_phone=phone, body=body)
        logger.info("IVR DTMF-1: Payment link sent to %s for event %s", phone, event_id)

    except Exception as exc:
        logger.error("IVR DTMF-1 failed for event %s: %s", event_id, exc)


async def _set_opt_out(event_id: str, customer_name: str) -> None:
    """Sets a permanent Redis opt-out key so the compliance engine never contacts this customer again."""
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(settings.redis_url, ssl_cert_reqs="none")
        # Use event_id prefix as customer_id proxy — in production, use the real customer_id
        opt_out_id = event_id[:12] if event_id else f"ivr_{customer_name}"
        await redis_client.set(f"revault:optout:{opt_out_id}", "1")
        await redis_client.aclose()
        logger.info("IVR DTMF-2: Opt-out set for customer_id=%s", opt_out_id)
    except Exception as exc:
        logger.error("IVR DTMF-2 opt-out failed: %s", exc)


async def _send_ivr_support_message(event_id: str, customer_name: str, db: AsyncSession) -> None:
    """Sends a WhatsApp support handoff message so a human agent can follow up."""
    try:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT raw_payload FROM payment_events WHERE id::text LIKE :prefix LIMIT 1"),
            {"prefix": f"{event_id[:8]}%"} if event_id else {"prefix": "%"},
        )
        row = result.fetchone()
        raw_payload = (row.raw_payload if row else {}) or {}
        customer = (
            raw_payload.get("payload", {}).get("payment", {}).get("entity", {}).get("customer", {}) or {}
        )
        phone = customer.get("contact", settings.your_personal_phone_number)

        if not phone:
            logger.warning("IVR DTMF-3: no phone found for event %s", event_id)
            return

        from tools.whatsapp_sender import send_whatsapp_text
        body = (
            f"Hi {customer_name}! 🙏 A ReVault support agent will get back to you shortly. "
            f"You can also reply to this message with your query — we're here to help!"
        )
        await send_whatsapp_text(to_phone=phone, body=body)
        logger.info("IVR DTMF-3: Support message sent to %s for event %s", phone, event_id)

    except Exception as exc:
        logger.error("IVR DTMF-3 failed for event %s: %s", event_id, exc)


# ─────────────────────────────────────────────────────────────────
# Audio stream endpoint — synthesises MP3 on demand for Twilio
# ─────────────────────────────────────────────────────────────────
@router.get("/play_audio")
async def play_audio(script: str, customer: str) -> FileResponse:
    """
    Generates Hinglish audio (ElevenLabs or gTTS fallback) and returns
    the MP3 file to Twilio's <Play> verb in real time.
    """
    from tools.voice_synthesizer import synthesize_hinglish
    result = await synthesize_hinglish(script, customer)
    return FileResponse(path=result.file_path, media_type="audio/mpeg")


# ─────────────────────────────────────────────────────────────────
# Incoming WhatsApp reply → PTP extraction pipeline
# ─────────────────────────────────────────────────────────────────
@router.post("/whatsapp")
async def twilio_whatsapp(
    From: str = Form(...),
    Body: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> PlainTextResponse:
    """
    Twilio calls this endpoint when a customer replies on WhatsApp.
    Passes the message to the PTP Tracker NLP engine to extract
    payment commitments (e.g. 'I will pay on Sunday').
    """
    logger.info("LIVE WhatsApp Reply received from %s: %s", From, Body)

    # Twilio sends From as "whatsapp:+91XXXXXXXXXX"
    customer_phone = From.replace("whatsapp:", "")

    from agents.ptp_tracker import process_incoming_reply
    await process_incoming_reply(customer_phone, Body, db)

    # Twilio requires a valid TwiML response even for messaging
    resp = MessagingResponse()
    return PlainTextResponse(str(resp), media_type="text/xml")
