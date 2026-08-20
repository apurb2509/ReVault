"""
Module 2: Abandonment Hunter Agent
Watches for orders that were created but never paid, runs tiered recovery.
"""
import logging

from tools.payment_links import create_recovery_link
from tools.whatsapp_sender import send_whatsapp_template
from agents.graph import AgentState

logger = logging.getLogger(__name__)

# Recovery tiers: (delay_minutes, message_type, include_discount)
RECOVERY_TIERS = [
    (0,    "instant_recovery",    False),   # Tier 1: immediate WhatsApp
    (120,  "personalized_nudge",  True),    # Tier 2: 2hr — personalized + discount
    (1440, "final_nudge",         False),   # Tier 3: 24hr — final message or escalate
]


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))

    order_id = event.order_id or event.raw_payload.get("payload", {}).get("order", {}).get("entity", {}).get("id")
    customer = _extract_customer(event.raw_payload)
    amount = event.amount or 0

    if not order_id or not customer.get("contact"):
        logger.warning("Cannot run Abandonment Hunter — missing order_id or customer contact")
        return {**state, "recovery_actions_taken": actions_taken}

    try:
        link = await create_recovery_link(
            order_id=order_id,
            amount=amount,
            customer_name=customer.get("name", "Customer"),
            customer_email=customer.get("email", ""),
            customer_phone=customer.get("contact", ""),
            description=f"Complete your pending order #{order_id}",
        )

        result = await send_whatsapp_template(
            to_phone=customer["contact"],
            template_name="order_recovery_tier1",
            language_code="en",
            components=[
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": customer.get("name", "there")},
                        {"type": "text", "text": f"₹{amount / 100:,.2f}"},
                        {"type": "text", "text": link.short_url},
                    ],
                }
            ],
        )

        actions_taken.append({
            "module": "ABANDONMENT_HUNTER",
            "action": "WHATSAPP_SENT",
            "tier": 1,
            "payment_link": link.short_url,
            "link_id": link.link_id,
            "message_id": result.message_id,
            "amount": amount,
        })

        logger.info("Abandonment Hunter: Tier 1 recovery sent for order %s", order_id)

    except Exception:
        logger.exception("Abandonment Hunter failed for event %s", event.id)

    return {**state, "recovery_actions_taken": actions_taken}


def _extract_customer(raw_payload: dict) -> dict:
    try:
        return raw_payload["payload"]["payment"]["entity"].get("customer", {}) or {}
    except (KeyError, TypeError):
        return {}
