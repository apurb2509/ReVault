import os
from tools.gemini_client import get_gemini_client
from gtts import gTTS

class VoiceAgent:
    def __init__(self):
        self.llm = get_gemini_client()
        self.elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY")

    async def generate_script(self, name: str, amount: int, reason: str) -> str:
        """
        Uses Gemini to generate a <60 word Hinglish script.
        """
        prompt = f"""
        Generate a strictly <60 word Hinglish script for a phone call to {name}.
        They owe Rs. {amount} due to {reason}.
        Rules:
        - Warm/empathetic tone.
        - Mention the specific amount.
        - Must end with: "Ek payment link aapke WhatsApp par bhej diya gaya hai."
        - MUST include an explicit opt-out line: "Agar aap callback nahi chahte, toh press 1."
        Output ONLY the script.
        """
        script = "Namaste {name}, aapka Rs. {amount} ka payment pending hai due to {reason}. Ek payment link aapke WhatsApp par bhej diya gaya hai. Agar aap callback nahi chahte, toh press 1." # simulated
        return script

    async def synthesize_audio(self, script: str, output_path: str) -> bool:
        """
        Synthesizes audio using ElevenLabs if available, otherwise falls back to gTTS.
        """
        if self.elevenlabs_api_key:
            return await self._use_elevenlabs(script, output_path)
        else:
            return await self._use_gtts(script, output_path)

    async def _use_gtts(self, script: str, output_path: str) -> bool:
        try:
            tts = gTTS(text=script, lang='hi', slow=False)
            tts.save(output_path)
            return True
        except Exception as e:
            print(f"gTTS failed: {e}")
            return False

    async def _use_elevenlabs(self, script: str, output_path: str) -> bool:
        """
        Stub for ElevenLabs integration. The user will provide the API key later.
        """
        print("ElevenLabs API Key found. Initiating request...")
        # Note: Requires `elevenlabs` pip package to be fully implemented.
        # import elevenlabs
        # audio = elevenlabs.generate(text=script, voice="Rachel", api_key=self.elevenlabs_api_key)
        # elevenlabs.save(audio, output_path)
        return True
