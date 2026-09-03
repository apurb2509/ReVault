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
from tools.hinglish_numbers import to_hinglish

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
        amount_words = to_hinglish(int(amount / 100))
        prompt = VOICE_SCRIPT_PROMPT.format(
            name=name,
            amount_words=amount_words,
            cause=reason,
            contact_history=contact_history,
        )
        try:
            result = await call_gemini(prompt)
            logger.info("Voice script generated for %s (tone: %s)", name, result.get("tone"))
            return result
        except Exception:
            logger.exception("Voice script generation failed — using fallback")
            amount_words = to_hinglish(int(amount / 100))
            return {
                "script": (
                    f"Namaste {name}, aapka {amount_words} rupay ka payment pending hai "
                    f"due to {reason}. Kripya ek baar retry karein — hum aapki help karne ke liye yahaan hain. "
                    "Payment link whatsapp par paanein ke liye 1 click karein, "
                    "service se opt out karne ke liye 2 dabayein, "
                    "whatsapp par support ya doubt puchne ke liye 3 dabayein. "
                    "Koi samasya ho toh humein batayein. — ReVault Recovery Team. Dhanyawaad."
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

    async def initiate_call(self, customer_name: str, phone: str, script: str) -> bool:
        """
        Initiates a real-time outbound call via Twilio.
        If Twilio is not configured, it just logs it (mock behavior).
        """
        from config import get_settings
        settings = get_settings()

        if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_voice_number):
            logger.info(f"Twilio Voice not configured — mocking call to {phone}")
            return False

        try:
            from twilio.rest import Client
            from urllib.parse import quote
            
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            
            target = settings.your_personal_phone_number if settings.your_personal_phone_number else phone
            
            ngrok_url = settings.ngrok_public_url.rstrip("/")
            if not ngrok_url:
                logger.error("NGROK URL missing. Twilio needs a public webhook URL to fetch TwiML.")
                return False
                
            twiml_url = f"{ngrok_url}/api/twilio/twiml?script={quote(script)}&customer={quote(customer_name)}"
            
            call = client.calls.create(
                to=target,
                from_=settings.twilio_voice_number,
                url=twiml_url
            )
            
            logger.info(f"Twilio Outbound Call initiated! SID: {call.sid}")
            return True
        except Exception as e:
            logger.error(f"Twilio Outbound Call failed: {e}")
            return False

    async def save_voice_call_record(self, customer_id: str, event_id: str, module: str, script_data: dict, audio_path: str) -> str:
        """Uploads audio to Supabase Storage and inserts a voice_calls record."""
        from db.supabase_client import supabase
        import os
        if not supabase:
            return ""
        
        file_name = os.path.basename(audio_path)
        try:
            with open(audio_path, "rb") as f:
                # Upsert is safer in case of retries
                try:
                    supabase.storage.from_("voice_calls").upload(file_name, f.read())
                except Exception:
                    pass # ignore if already exists
            public_url = supabase.storage.from_("voice_calls").get_public_url(file_name)
            
            record = {
                "customer_id": customer_id,
                "event_id": event_id if event_id else None,
                "module": module,
                "language": script_data.get("language_mix", "Hinglish"),
                "tone": script_data.get("tone", "warm"),
                "transcript": script_data.get("script", ""),
                "audio_url": public_url,
                "outcome": "GENERATED",
            }
            supabase.table("voice_calls").insert(record).execute()
            logger.info("Voice call record inserted into Supabase with URL: %s", public_url)
            return public_url
        except Exception as e:
            logger.error("Failed to save voice call to Supabase: %s", e)
            return ""
