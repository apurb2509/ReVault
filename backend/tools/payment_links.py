import logging
import time
from dataclasses import dataclass
from typing import Any

import razorpay

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = razorpay.Client(
    auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
)


@dataclass
class CreatedPaymentLink:
    link_id: str
    short_url: str
    amount: int    # paise
    expire_by: int # unix timestamp


async def create_recovery_link(
    order_id: str,
    amount: int,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    description: str,
    expiry_hours: int = 24,
) -> CreatedPaymentLink:
    """
    Creates a pre-filled Razorpay Payment Link for recovery outreach.
    The link expires after expiry_hours to create urgency.
    """
    expire_by = int(time.time()) + expiry_hours * 3600
    payload = {
        "amount": amount,
        "currency": "INR",
        "description": description,
        "customer": {
            "name": customer_name,
            "email": customer_email,
            "contact": customer_phone,
        },
        "notify": {"sms": True, "email": True},
        "callback_url": "https://revault.app/recovery/confirmed",
        "callback_method": "get",
        "expire_by": expire_by,
        "reference_id": order_id,
    }

    try:
        result = _client.payment_link.create(payload)
        return CreatedPaymentLink(
            link_id=result["id"],
            short_url=result["short_url"],
            amount=amount,
            expire_by=expire_by,
        )
    except Exception:
        logger.exception("Failed to create payment link for order %s", order_id)
        raise


async def fetch_link_status(link_id: str) -> dict[str, Any]:
    try:
        return _client.payment_link.fetch(link_id)
    except Exception:
        logger.exception("Failed to fetch payment link %s", link_id)
        raise


class PaymentLinkGenerator:
    """
    OOP wrapper for payment link creation.
    Used by subscription_mandate_engine.py and other class-based agents.
    Delegates to the module-level create_recovery_link() function.
    """

    async def create(
        self,
        order_id: str,
        amount: int,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        description: str,
        expiry_hours: int = 24,
    ) -> CreatedPaymentLink:
        return await create_recovery_link(
            order_id=order_id,
            amount=amount,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            description=description,
            expiry_hours=expiry_hours,
        )

    async def fetch_status(self, link_id: str) -> dict[str, Any]:
        return await fetch_link_status(link_id)

