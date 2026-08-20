"""
Module 4: B2B Receivables Pursuit Agent
Ages outstanding invoices, scores risk via Gemini, and runs multi-touch recovery.
"""
import logging
from datetime import date

from tools.gemini_client import INVOICE_RISK_PROMPT, call_gemini
from tools.payment_links import create_recovery_link
from tools.whatsapp_sender import send_whatsapp_text
from tools.email_sender import build_recovery_email, send_email
from models.invoice import Invoice, RiskTier
from agents.graph import AgentState

logger = logging.getLogger(__name__)


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))

    invoice = _extract_invoice(event.raw_payload)
    if not invoice:
        logger.warning("Receivables Pursuit: could not extract invoice from event %s", event.id)
        return {**state, "recovery_actions_taken": actions_taken}

    risk_tier = _compute_risk_tier(invoice.days_outstanding)
    invoice.risk_tier = risk_tier

    risk_analysis = await _analyze_risk(invoice)
    action = await _execute_recovery(invoice, risk_tier, risk_analysis)
    if action:
        actions_taken.append(action)

    return {**state, "recovery_actions_taken": actions_taken}


def _compute_risk_tier(days_outstanding: int) -> RiskTier:
    if days_outstanding <= 30:
        return RiskTier.GREEN
    if days_outstanding <= 60:
        return RiskTier.YELLOW
    if days_outstanding <= 90:
        return RiskTier.ORANGE
    return RiskTier.RED


async def _analyze_risk(invoice: Invoice) -> dict:
    prompt = INVOICE_RISK_PROMPT.format(
        company_name=invoice.customer_company,
        invoice_history="No prior invoice history available",
        last_payment_date="Unknown",
        amount_rupees=invoice.amount / 100,
        inv_number=invoice.invoice_number,
        due_date=invoice.due_date.isoformat(),
        payment_pattern="Unknown",
    )
    try:
        return await call_gemini(prompt)
    except Exception:
        logger.exception("Invoice risk analysis failed for %s", invoice.invoice_number)
        return {
            "risk_score": 50,
            "recommended_tone": "firm",
            "best_channel": "email",
            "personalized_message": f"Your invoice #{invoice.invoice_number} is overdue. Please arrange payment.",
            "escalation_trigger_date": date.today().isoformat(),
        }


async def _execute_recovery(invoice: Invoice, tier: RiskTier, risk_analysis: dict) -> dict | None:
    match tier:
        case RiskTier.GREEN:
            success = await send_email(
                to_email=invoice.customer_contact,
                to_name=invoice.customer_company,
                subject=f"Friendly reminder: Invoice #{invoice.invoice_number} due",
                html_content=build_recovery_email(
                    customer_name=invoice.customer_company,
                    amount_rupees=invoice.amount / 100,
                    payment_link="#",
                    reason="payment due",
                ),
            )
            return {"module": "RECEIVABLES_PURSUIT", "action": "EMAIL_SENT", "tier": tier, "success": success}

        case RiskTier.YELLOW:
            message = risk_analysis.get("personalized_message", f"Invoice #{invoice.invoice_number} overdue")
            await send_whatsapp_text(to_phone=invoice.customer_phone, body=message)
            return {"module": "RECEIVABLES_PURSUIT", "action": "WHATSAPP_SENT", "tier": tier}

        case RiskTier.ORANGE:
            link = await create_recovery_link(
                order_id=invoice.invoice_number,
                amount=invoice.amount,
                customer_name=invoice.customer_company,
                customer_email=invoice.customer_contact,
                customer_phone=invoice.customer_phone,
                description=f"Settle Invoice #{invoice.invoice_number}",
                expiry_hours=72,
            )
            await send_whatsapp_text(
                to_phone=invoice.customer_phone,
                body=f"{risk_analysis.get('personalized_message', '')} Payment link: {link.short_url}",
            )
            return {"module": "RECEIVABLES_PURSUIT", "action": "WHATSAPP_WITH_LINK", "tier": tier, "link": link.short_url}

        case RiskTier.RED:
            # 90+ days — stop AI contact, escalate to human
            logger.warning("Invoice %s is RED tier — escalating to human", invoice.invoice_number)
            return {"module": "RECEIVABLES_PURSUIT", "action": "HUMAN_ESCALATION", "tier": tier, "reason": "90+ days outstanding"}

    return None


def _extract_invoice(raw_payload: dict) -> Invoice | None:
    try:
        data = raw_payload.get("invoice", {})
        if not data:
            return None
        return Invoice(
            invoice_number=data["invoice_number"],
            customer_company=data["customer_company"],
            customer_contact=data["customer_contact"],
            customer_phone=data["customer_phone"],
            amount=data["amount"],
            due_date=date.fromisoformat(data["due_date"]),
        )
    except (KeyError, ValueError):
        return None
