import logging
from datetime import datetime, timedelta
from typing import Any

import razorpay

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Single client instance — thread-safe, reused across requests
_client = razorpay.Client(
    auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
)


class RazorpayClient:
    """
    Thin, typed wrapper around the Razorpay Python SDK.
    All monetary amounts are in paise (integer). Callers must convert.
    All operations target test mode — no real money moves.
    """

    async def fetch_payments(
        self,
        from_dt: datetime,
        to_dt: datetime,
        count: int = 100,
    ) -> list[dict[str, Any]]:
        """Fetches payments in a time window for degradation monitoring."""
        try:
            result = _client.payment.all({
                "from": int(from_dt.timestamp()),
                "to": int(to_dt.timestamp()),
                "count": count,
            })
            return result.get("items", [])
        except Exception:
            logger.exception("Failed to fetch payments from Razorpay")
            return []

    async def fetch_payment(self, payment_id: str) -> dict[str, Any] | None:
        try:
            return _client.payment.fetch(payment_id)
        except Exception:
            logger.exception("Failed to fetch payment %s", payment_id)
            return None

    async def fetch_order(self, order_id: str) -> dict[str, Any] | None:
        try:
            return _client.order.fetch(order_id)
        except Exception:
            logger.exception("Failed to fetch order %s", order_id)
            return None

    async def fetch_orders_without_payment(
        self,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """Returns orders created in the window that have no associated payments."""
        try:
            result = _client.order.all({
                "from": int(from_dt.timestamp()),
                "to": int(to_dt.timestamp()),
                "count": 100,
                "authorized": 0,   # Only unpaid orders
            })
            return result.get("items", [])
        except Exception:
            logger.exception("Failed to fetch orders")
            return []

    async def fetch_subscription(self, subscription_id: str) -> dict[str, Any] | None:
        try:
            return _client.subscription.fetch(subscription_id)
        except Exception:
            logger.exception("Failed to fetch subscription %s", subscription_id)
            return None

    async def is_payment_captured(self, payment_id: str) -> bool:
        """
        The single authoritative check for whether a recovery actually succeeded.
        "Recovered" means payment.status == 'captured' — nothing else counts.
        """
        payment = await self.fetch_payment(payment_id)
        return bool(payment and payment.get("status") == "captured")
