import json
import logging
from typing import Any

import google.generativeai as genai

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)

# Flash for speed-sensitive tasks; Pro for complex reasoning
_FLASH = genai.GenerativeModel("gemini-1.5-flash")
_PRO = genai.GenerativeModel("gemini-1.5-pro")

_JSON_CONFIG = genai.GenerationConfig(
    response_mime_type="application/json",
    temperature=0.1,    # Low temperature for structured, deterministic outputs
)


async def call_gemini(prompt: str, use_pro: bool = False) -> dict[str, Any]:
    """
    Calls Gemini with structured JSON output mode.
    Returns the parsed JSON dict or raises on parse failure.
    The caller decides whether to trust the output — never execute money
    movement based solely on LLM output without a compliance gate.
    """
    model = _PRO if use_pro else _FLASH
    try:
        response = model.generate_content(prompt, generation_config=_JSON_CONFIG)
        return json.loads(response.text)
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON output: %s", response.text[:500])
        raise ValueError(f"Gemini output was not valid JSON: {exc}") from exc
    except Exception as exc:
        logger.exception("Gemini API call failed")
        raise


RCA_PROMPT = """
You are a payment infrastructure analyst for an Indian fintech.

Payment failure batch (last 15 minutes):
{failure_summary}

Historical baseline (24-hour rolling average):
{baseline_metrics}

Analyze the failure patterns and return a JSON object with exactly these fields:
{{
  "root_cause": "<one of: BANK_INFRA_DOWN, CARD_ISSUER_BLOCK, UPI_RAIL_DEGRADED, GATEWAY_ROUTING_ISSUE, FRAUD_FILTER_SPIKE, FRAUD_SUSPECTED, INSUFFICIENT_FUNDS, TECHNICAL_ERROR, UNKNOWN>",
  "affected_segments": ["<bank/method/amount_range strings>"],
  "confidence": <float 0.0 to 1.0>,
  "merchant_advisory": "<clear, actionable 1-2 sentence advisory for the merchant>",
  "expected_resolution_window": "<e.g. '2-4 hours' or 'unknown' if not infrastructure-related>",
  "auto_action_permitted": <true or false — advisory only, compliance engine has final authority>
}}
"""

PTP_EXTRACTION_PROMPT = """
You are analyzing a customer's reply to a payment reminder.

Customer message:
"{customer_message}"

Today's date: {today}

Extract payment commitment information and return a JSON object:
{{
  "has_commitment": <true or false>,
  "promised_date": "<ISO date string YYYY-MM-DD, or null if no commitment>",
  "promised_amount": <integer in paise, or null if not mentioned>,
  "confidence": "<HIGH, MEDIUM, or LOW>",
  "dispute_raised": <true or false>,
  "escalation_needed": <true or false>,
  "reasoning": "<brief explanation of why you classified it this way>"
}}

Parse natural language dates relative to today. Examples:
- "I'll pay on Friday" → next Friday's date
- "Will send this week" → 5 days from today
- "We'll settle next month" → 1st of next month
"""

INVOICE_RISK_PROMPT = """
You are a B2B collections analyst.

Invoice history for {company_name}:
{invoice_history}

Last payment received: {last_payment_date}
Current outstanding: ₹{amount_rupees} (Invoice #{inv_number}, due {due_date})
Customer payment behavior: {payment_pattern}

Analyze and return a JSON object:
{{
  "risk_score": <integer 0 to 100, higher = higher risk of non-payment>,
  "recommended_tone": "<gentle, firm, or legal>",
  "best_channel": "<whatsapp, email, voice, or escalate>",
  "personalized_message": "<personalized WhatsApp message in Hinglish if appropriate, otherwise English>",
  "escalation_trigger_date": "<ISO date string YYYY-MM-DD>"
}}
"""

VOICE_SCRIPT_PROMPT = """
Generate a 30-second Hinglish voice recovery script.

Customer: {name}
Amount: ₹{amount_rupees}
Failure reason: {cause}
Previous contacts: {contact_history}
Tone: Warm, empathetic, helpful. NOT aggressive. NOT robotic.

Rules:
- Maximum 60 words
- Natural Hinglish blend (not pure Hindi, not pure English)
- Personalize with the customer's name
- Mention the specific amount
- End with: "Aapke WhatsApp pe payment link bhej diya hai"
- Must include opt-out: "Agar aap callback nahi chahte toh hume batayein"

Return a JSON object:
{{
  "script": "<the full script text>",
  "language_mix": "<Hinglish, Hindi-heavy, or English-heavy>",
  "tone": "<warm, urgent, or empathetic>"
}}
"""
