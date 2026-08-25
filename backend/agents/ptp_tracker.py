"""
Module 7: Promise-to-Pay (PTP) Tracker
Extracts payment commitments from customer text using NLP and monitors them.
"""
import logging
from datetime import date
import json

from tools.gemini_client import PTP_EXTRACTION_PROMPT
from models.payment_event import EventType
from agents.graph import AgentState
from config import get_settings
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))

    # If this is a payment captured event, we just check if it resolves an open PTP.
    # In a real app this would query the DB for ACTIVE PTPs for this customer and mark them KEPT.
    if event.event_type == EventType.PAYMENT_CAPTURED:
        logger.info("PTP Tracker: payment captured, resolving active PTPs for customer %s", state["customer_id"])
        actions_taken.append({"module": "PTP_TRACKER", "action": "PTP_RESOLVED"})
        return {**state, "recovery_actions_taken": actions_taken}

    # Otherwise, check if we have a customer reply in the payload to analyze
    # (For demo purposes, we expect test events to sometimes contain a "customer_reply" field)
    reply_text = event.raw_payload.get("customer_reply")
    if not reply_text:
        return state

    prompt = PTP_EXTRACTION_PROMPT.format(
        customer_message=reply_text,
        today=date.today().isoformat(),
    )

    try:
        settings = get_settings()
        if not settings.openai_api_key:
            logger.error("OPENAI_API_KEY is not set. Cannot run PTP extraction.")
            return state

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a financial NLP agent. Extract data as JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
        )
        ptp_data = json.loads(response.choices[0].message.content)

        if ptp_data.get("has_commitment") and ptp_data.get("promised_date"):
            logger.info("PTP Tracker: extracted promise to pay on %s", ptp_data["promised_date"])
            actions_taken.append({
                "module": "PTP_TRACKER",
                "action": "PTP_CREATED",
                "promised_date": ptp_data["promised_date"],
                "confidence": ptp_data.get("confidence", "LOW"),
            })
            return {
                **state,
                "ptp_created": ptp_data,
                "recovery_actions_taken": actions_taken,
            }
        elif ptp_data.get("escalation_needed"):
            logger.warning("PTP Tracker: escalation needed based on customer reply")
            actions_taken.append({
                "module": "PTP_TRACKER",
                "action": "HUMAN_ESCALATION",
                "reason": ptp_data.get("reasoning", "Unknown"),
            })
            return {
                **state,
                "escalated": True,
                "recovery_actions_taken": actions_taken,
            }

    except Exception:
        logger.exception("PTP Tracker failed to analyze reply for event %s", event.id)

    return state


async def process_incoming_reply(customer_phone: str, message: str, db) -> None:
    """
    Unified entry point for both live WhatsApp webhooks and the simulation endpoint.
    Extracts PTP commitment from customer text and writes it directly to the Supabase ptp_records table.
    """
    logger.info("Processing incoming reply from %s: %s", customer_phone, message)
    prompt = PTP_EXTRACTION_PROMPT.format(
        customer_message=message,
        today=date.today().isoformat(),
    )
    
    try:
        settings = get_settings()
        if not settings.openai_api_key:
            logger.error("OPENAI_API_KEY is not set. Cannot run PTP extraction.")
            return

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a financial NLP agent. Extract data as JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
        )
        ptp_data = json.loads(response.choices[0].message.content)
        
        if ptp_data.get("has_commitment") and ptp_data.get("promised_date"):
            logger.info("Extracted PTP: %s", ptp_data["promised_date"])
            
            # Write directly to Supabase
            from db.supabase_client import supabase
            if supabase:
                record = {
                    "customer_id": customer_phone,
                    "promised_amount": ptp_data.get("promised_amount"),
                    "promised_date": ptp_data["promised_date"],
                    "extraction_source": "WHATSAPP_CHAT",
                    "commitment_confidence": ptp_data.get("confidence", "LOW"),
                    "status": "ACTIVE"
                }
                supabase.table("ptp_records").insert(record).execute()
                logger.info("Inserted PTP record into Supabase")
        else:
            logger.info("No commitment detected in message.")
    except Exception:
        logger.exception("Failed to process incoming reply for PTP extraction")
