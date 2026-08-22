"""
Voice Recovery Agent
Generates a Hinglish script via Gemini, synthesizes audio via ElevenLabs or gTTS,
and returns a structured result for compliance gate validation.
"""
import logging
import os
from typing import Any

from gtts import gTTS

from tools.gemini_client import VOICE_SCRIPT_PROMPT, call_gemini, get_gemini_client

logger = logging.getLogger(__name__)


class VoiceAgent:
    def __init__(self) -> None:
        self.llm = get_gemini_client()
        self.elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY", "")

    async def generate_script(
        self,
        name: str,
        amount: int,
        reason: str,
        contact_history: str = "First contact",
    ) -> dict[str, Any]:
        """
        Uses Gemini to generate a <60 word Hinglish recovery script.
        Returns the full structured JSON response from Gemini.
        Fallback dict is returned if Gemini fails.
        """
        prompt = VOICE_SCRIPT_PROMPT.format(
            name=name,
            amount_rupees=amount / 100,
            cause=reason,
            contact_history=contact_history,
        )
        try:
            result = await call_gemini(prompt)
            logger.info("Voice script generated for %s (tone: %s)", name, result.get("tone"))
            return result
        except Exception:
            logger.exception("Voice script generation failed — using fallback")
            return {
                "script": (
                    f"Namaste {name}, aapka ₹{amount / 100:,.0f} ka payment pending hai "
                    f"due to {reason}. Aapke WhatsApp pe payment link bhej diya hai. "
                    "Agar aap callback nahi chahte toh hume batayein."
                ),
                "language_mix": "Hinglish",
                "tone": "warm",
            }

    async def synthesize_audio(self, script: str, output_path: str) -> bool:
        """
        Synthesizes audio using ElevenLabs if key is set, otherwise gTTS.
        Returns True on success, False on failure.
        """
        if self.elevenlabs_api_key:
            return await self._use_elevenlabs(script, output_path)
        return await self._use_gtts(script, output_path)

    async def _use_gtts(self, script: str, output_path: str) -> bool:
        """Synthesizes Hinglish speech via Google TTS — no API key required."""
        try:
            # hi = Hindi works best for Hinglish blends
            tts = gTTS(text=script, lang="hi", slow=False)
            tts.save(output_path)
            logger.info("gTTS audio saved to %s", output_path)
            return True
        except Exception:
            logger.exception("gTTS synthesis failed")
            return False

    async def _use_elevenlabs(self, script: str, output_path: str) -> bool:
        """
        ElevenLabs voice synthesis for high-quality Hinglish.
        Requires the `elevenlabs` pip package (not in requirements by default).
        """
        try:
            from elevenlabs import VoiceSettings  # type: ignore[import]
            from elevenlabs.client import ElevenLabs  # type: ignore[import]

            client = ElevenLabs(api_key=self.elevenlabs_api_key)
            audio = client.text_to_speech.convert(
                voice_id="pNInz6obpgDQGcFmaJgB",  # Adam — works well for Hinglish
                text=script,
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.75),
            )
            with open(output_path, "wb") as f:
                for chunk in audio:
                    f.write(chunk)
            logger.info("ElevenLabs audio saved to %s", output_path)
            return True
        except ImportError:
            logger.warning("elevenlabs package not installed — falling back to gTTS")
            return await self._use_gtts(script, output_path)
        except Exception:
            logger.exception("ElevenLabs synthesis failed — falling back to gTTS")
            return await self._use_gtts(script, output_path)
