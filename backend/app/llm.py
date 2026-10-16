"""The ONLY file that talks to an AI provider.

Every agent calls generate_text(). To switch from Gemini to Claude later you
change this one file (and one setting), nothing else.
"""
from .config import GEMINI_API_KEY, GEMINI_MODEL


class LLMNotConfigured(Exception):
    """No API key set."""


class LLMError(Exception):
    """The provider failed (network, quota, bad model name, ...)."""


def generate_text(prompt: str, system: str | None = None, json_mode: bool = False) -> str:
    if not GEMINI_API_KEY:
        raise LLMNotConfigured("GEMINI_API_KEY is missing")
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=30_000),  # 30 seconds, in ms
        )
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.2,
            response_mime_type="application/json" if json_mode else None,
        )
        response = client.models.generate_content(
            model=GEMINI_MODEL, contents=prompt, config=config
        )
        return response.text or ""
    except Exception as exc:  # any provider problem becomes one clean error
        print("LLM ERROR:", repr(exc))
        raise LLMError(str(exc)) from exc

