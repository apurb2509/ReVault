"""
Module 6: VoiceIQ Recovery Agent
Generates personalized Hinglish voice scripts and synthesizes audio.
"""
import logging

from tools.gemini_client import VOICE_SCRIPT_PROMPT, call_gemini
from tools.voice_synthesizer import synthesize_hinglish
from agents.graph import AgentState

logger = logging.getLogger(__name__)


async def run(state: AgentState) -> AgentState:
    event = state["event"]
    actions_taken = list(state.get("recovery_actions_taken", []))

    amount = event.amount or 0
    customer = _extract_customer(event.raw_payload)
    name = customer.get("name", "Customer")
    cause = getattr(event.failure_cause, "value", str(event.failure_cause))

    prompt = VOICE_SCRIPT_PROMPT.format(
        name=name,
        amount_rupees=amount / 100,
        cause=cause,
        contact_history="No previous contact today",
    )

    try:
        script_data = await call_gemini(prompt)
        script_text = script_data.get("script", f"Namaste {name}, aapka payment fail ho gaya hai. Check WhatsApp.")

        audio = await synthesize_hinglish(script_text, name)

        logger.info("VoiceIQ generated audio via %s for event %s", audio.engine_used, event.id)
        actions_taken.append({
            "module": "VOICE_AGENT",
            "action": "VOICE_CALL_INITIATED",
            "audio_url": f"/api/audio/{audio.file_path.split('/')[-1]}", # Mock delivery endpoint
            "engine": audio.engine_used,
        })

        return {
            **state,
            "voice_script": script_text,
            "recovery_actions_taken": actions_taken,
        }

    except Exception:
        logger.exception("VoiceIQ Agent failed for event %s", event.id)

    return {**state, "recovery_actions_taken": actions_taken}


def _extract_customer(raw_payload: dict) -> dict:
    try:
        return raw_payload["payload"]["payment"]["entity"].get("customer", {}) or {}
    except (KeyError, TypeError):
        return {}
