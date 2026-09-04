import json
import logging
from typing import Any
from openai import AsyncOpenAI

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Groq is fully compatible with the OpenAI SDK! We just change the base_url.
client = AsyncOpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1"
)

async def call_groq_json(prompt: str, model: str = "llama3-70b-8192") -> dict[str, Any]:
    """
    Calls Groq with structured JSON output mode using JSON mode.
    """
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from Groq")
        return json.loads(content)
    except json.JSONDecodeError as exc:
        logger.error("Groq returned non-JSON output")
        raise ValueError(f"Groq output was not valid JSON: {exc}") from exc
    except Exception as e:
        logger.exception("Groq API call failed")
        raise
