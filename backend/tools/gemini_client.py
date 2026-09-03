import asyncio
import json
import logging
from typing import Any

import google.generativeai as genai

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)

# Flash for speed-sensitive tasks; Pro for complex reasoning
_FLASH = genai.GenerativeModel("gemini-3.6-flash")
_PRO = genai.GenerativeModel("gemini-3.6-flash")  # Use Flash for both — Pro is deprecated in v0.8

_JSON_CONFIG = genai.GenerationConfig(
    response_mime_type="application/json",
    temperature=0.1,    # Low temperature for structured, deterministic outputs
)


class GeminiClient:
    """
    OOP wrapper returned by get_gemini_client().
    Agents that hold a self.llm reference use this.
    All calls go through the same underlying call_gemini() function.
    """

    async def generate(self, prompt: str, use_pro: bool = False) -> dict[str, Any]:
        """Async structured JSON generation."""
        return await call_gemini(prompt, use_pro=use_pro)

    async def generate_text(self, prompt: str) -> str:
        """Returns raw text for cases where structured JSON is not needed."""
        model = _FLASH
        for attempt in range(5):
            try:
                response = await model.generate_content_async(prompt)
                return response.text
            except Exception as e:
                if "429" in str(e) or "ResourceExhausted" in type(e).__name__:
                    if attempt == 4:
                        raise
                    delay = 5 * (2 ** attempt)
                    logger.warning(f"Gemini Rate Limit hit. Sleeping for {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                logger.exception("Gemini text generation failed")
                raise


def get_gemini_client() -> GeminiClient:
    """
    Returns a GeminiClient instance.
    Imported by voice_agent, b2b_chaser, subscription_mandate_engine.
    """
    return GeminiClient()


async def call_gemini(prompt: str, use_pro: bool = False) -> dict[str, Any]:
    """
    Calls Gemini with structured JSON output mode.
    Returns the parsed JSON dict or raises on parse failure.
    The caller decides whether to trust the output — never execute money
    movement based solely on LLM output without a compliance gate.
    """
    model = _PRO if use_pro else _FLASH
    for attempt in range(5):
        try:
            response = await model.generate_content_async(prompt, generation_config=_JSON_CONFIG)
            return json.loads(response.text)
        except json.JSONDecodeError as exc:
            logger.error("Gemini returned non-JSON output: %s", response.text[:500])
            raise ValueError(f"Gemini output was not valid JSON: {exc}") from exc
        except Exception as e:
            if "429" in str(e) or "ResourceExhausted" in type(e).__name__:
                if attempt == 4:
                    raise
                delay = 5 * (2 ** attempt)
                logger.warning(f"Gemini Rate Limit hit in call_gemini. Sleeping for {delay} seconds...")
                await asyncio.sleep(delay)
                continue
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
Generate a 30-second Hinglish voice recovery script with IVR instructions.

Customer: {name}
Amount: {amount_words} rupay
Failure reason: {cause}
Previous contacts: {contact_history}
Tone: Warm, empathetic, helpful. NOT aggressive. NOT robotic.

Rules:
- Maximum 80 words
- Natural Hinglish blend (not pure Hindi, not pure English)
- Personalize with the customer's name
- Mention the specific amount clearly in Hinglish words (e.g. use "pachaas hazaar rupay" instead of numbers like "50000")
- MUST end the script with these IVR options in Hinglish: "Payment link whatsapp par paanein ke liye 1 click karein, service se opt out karne ke liye 2 dabayein, whatsapp par support ya doubt puchne ke liye 3 dabayein. Koi samasya ho toh humein batayein. — ReVault Recovery Team. Dhanyawaad."
- DO NOT say "Aapke WhatsApp pe payment link bhej diya hai".

Return a JSON object:
{{
  "script": "<the full script text>",
  "language_mix": "<Hinglish, Hindi-heavy, or English-heavy>",
  "tone": "<warm, urgent, or empathetic>"
}}
"""
