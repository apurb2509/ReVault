import hashlib
import hmac
import json
import logging
from typing import Any

from fastapi import Request

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class WebhookVerificationError(Exception):
    pass


def verify_razorpay_signature(payload_bytes: bytes, signature: str) -> bool:
    """
    Validates the X-Razorpay-Signature header using HMAC-SHA256.
    Must run before any event processing — an invalid signature is a hard stop.
    """
    expected = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def parse_webhook(request: Request) -> dict[str, Any]:
    """
    Reads the raw request body, verifies the Razorpay signature, and returns
    the parsed JSON payload. Raises WebhookVerificationError on invalid signature.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature:
        raise WebhookVerificationError("Missing X-Razorpay-Signature header")

    if not verify_razorpay_signature(body, signature):
        raise WebhookVerificationError("Signature verification failed — potential replay attack")

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise WebhookVerificationError(f"Invalid JSON payload: {exc}") from exc


def extract_event_id(payload: dict[str, Any]) -> str:
    """
    Extracts the Razorpay event ID used for idempotency dedup.
    Razorpay sends this as payload['id'] for webhook events.
    """
    event_id = payload.get("id")
    if not event_id:
        raise WebhookVerificationError("Payload missing event ID — cannot guarantee idempotency")
    return event_id
