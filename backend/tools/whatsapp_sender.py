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


async def send_whatsapp_text(
    to_phone: str,
    body: str,
    preview_url: bool = False,
) -> MessageResult:
    """
    Sends a free-form text message via WhatsApp Business Cloud API.
    Only works within the 24-hour customer service window.
    For outbound marketing/recovery, use send_whatsapp_template instead.
    """
    if not settings.feature_whatsapp_enabled:
        logger.info("WhatsApp disabled — skipping message to %s", to_phone)
        return MessageResult(message_id="DISABLED", status="SKIPPED")

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
