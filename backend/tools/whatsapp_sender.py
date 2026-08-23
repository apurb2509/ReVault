import logging
from dataclasses import dataclass

import httpx

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_GRAPH_API_BASE = "https://graph.facebook.com/v20.0"


@dataclass
class MessageResult:
    message_id: str
    status: str


from twilio.rest import Client

async def send_whatsapp_text(
    to_phone: str,
    body: str,
    preview_url: bool = False,
) -> MessageResult:
    """
    Sends a WhatsApp message via Twilio (Real-time).
    Falls back to original logic if Twilio is not configured.
    """
    if not settings.feature_whatsapp_enabled:
        logger.info("WhatsApp disabled — skipping message to %s", to_phone)
        return MessageResult(message_id="DISABLED", status="SKIPPED")

    if settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            target = settings.your_personal_phone_number if settings.your_personal_phone_number else to_phone
            if not target.startswith("whatsapp:"):
                target = f"whatsapp:{target}"
            
            from_num = settings.twilio_whatsapp_number
            if not from_num.startswith("whatsapp:"):
                from_num = f"whatsapp:{from_num}"
                
            message = client.messages.create(
                from_=from_num,
                body=body,
                to=target
            )
            logger.info(f"Twilio WhatsApp sent! SID: {message.sid}")
            return MessageResult(message_id=message.sid, status="SENT")
        except Exception as e:
            logger.error(f"Twilio WhatsApp failed: {e}")
            return MessageResult(message_id="FAILED", status="ERROR")

    # Fallback to standard Meta Graph API
    url = f"{_GRAPH_API_BASE}/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": body, "preview_url": preview_url},
    }
    return await _send(url, payload)


async def send_whatsapp_template(
    to_phone: str,
    template_name: str,
    language_code: str,
    components: list[dict],
) -> MessageResult:
    """
    Sends an approved template message — required for outbound recovery outreach
    outside the 24-hour window. Templates must be pre-approved in Meta Business Manager.
    """
    if not settings.feature_whatsapp_enabled:
        logger.info("WhatsApp disabled — skipping template to %s", to_phone)
        return MessageResult(message_id="DISABLED", status="SKIPPED")

    if settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            target = settings.your_personal_phone_number if settings.your_personal_phone_number else to_phone
            if not target.startswith("whatsapp:"):
                target = f"whatsapp:{target}"
            
            from_num = settings.twilio_whatsapp_number
            if not from_num.startswith("whatsapp:"):
                from_num = f"whatsapp:{from_num}"
                
            # For Twilio demo, we just send a mock of the template
            mock_body = f"[{template_name.upper()}]\n"
            for comp in components:
                for param in comp.get("parameters", []):
                    if param.get("type") == "text":
                        mock_body += f"{param.get('text')} "
                        
            message = client.messages.create(
                from_=from_num,
                body=mock_body,
                to=target
            )
            logger.info(f"Twilio WhatsApp Template sent! SID: {message.sid}")
            return MessageResult(message_id=message.sid, status="SENT")
        except Exception as e:
            logger.error(f"Twilio WhatsApp Template failed: {e}")
            return MessageResult(message_id="FAILED", status="ERROR")

    # Fallback to standard Meta Graph API
    url = f"{_GRAPH_API_BASE}/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }
    return await _send(url, payload)


async def _send(url: str, payload: dict) -> MessageResult:
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        message_id = data.get("messages", [{}])[0].get("id", "unknown")
        return MessageResult(message_id=message_id, status="SENT")
