import io
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class SynthesizedAudio:
    file_path: str
    script: str
    engine_used: str    # "gtts" or "elevenlabs"


async def synthesize_hinglish(script: str, customer_name: str) -> SynthesizedAudio:
    """
    Converts a Hinglish script to audio.
    Tries ElevenLabs first (higher quality) if the API key is configured;
    falls back to gTTS (completely free, no API key required).
    Pre-generated fallback clips are loaded from simulation/audio/ during demo.
    """
    if settings.elevenlabs_api_key:
        try:
            return await _synthesize_elevenlabs(script)
        except Exception:
            logger.warning("ElevenLabs failed — falling back to gTTS")

    return await _synthesize_gtts(script)


async def _synthesize_gtts(script: str) -> SynthesizedAudio:
    from gtts import gTTS
    import asyncio

    def _sync_gtts():
        tts = gTTS(text=script, lang="hi", slow=False)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()  # Ensure the file is not locked
        tts.save(tmp.name)
        return tmp.name

    file_path = await asyncio.to_thread(_sync_gtts)
    return SynthesizedAudio(file_path=file_path, script=script, engine_used="gtts")


async def _synthesize_elevenlabs(script: str) -> SynthesizedAudio:
    import httpx

    # Using the "Bella" voice — closest to a warm, conversational Indian accent
    voice_id = "EXAVITQu4vr4xnSDxMaL"
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": script,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    async with httpx.AsyncClient(timeout=3.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()

    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp.write(response.content)
    tmp.close()
    return SynthesizedAudio(file_path=tmp.name, script=script, engine_used="elevenlabs")


def load_pregenerated_clip(cause: str) -> SynthesizedAudio | None:
    """
    Loads a pre-generated Hinglish audio clip for demo fallback.
    Clips are stored in simulation/audio/{cause}.mp3.
    """
    clip_path = Path("simulation") / "audio" / f"{cause.lower()}.mp3"
    if clip_path.exists():
        return SynthesizedAudio(
            file_path=str(clip_path),
            script="[pre-generated clip]",
            engine_used="pregenerated",
        )
    return None
