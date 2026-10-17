"""The ONLY file that talks to an AI provider.

Every agent calls generate_text(). To switch from Gemini to Claude later you
change this one file (and one setting), nothing else.
"""
import time

from .config import GEMINI_API_KEY, GEMINI_FALLBACK_MODELS, GEMINI_MODEL


class LLMNotConfigured(Exception):
    """No API key set."""


class LLMError(Exception):
    """The provider failed (network, quota, bad model name, ...)."""


RETRY_CODES = {429, 500, 502, 503, 504}   # busy / rate limited: worth trying again
BAD_KEY_CODES = {400, 401, 403}           # key problem: other models will fail too
TRIES_PER_MODEL = 3


def generate_text(prompt: str, system: str | None = None, json_mode: bool = False) -> str:
    if not GEMINI_API_KEY:
        raise LLMNotConfigured("GEMINI_API_KEY is missing")
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise LLMError("The google-genai package is not installed") from exc

    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=20_000),  # 20 seconds, in ms
    )
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        response_mime_type="application/json" if json_mode else None,
    )

    models = [GEMINI_MODEL] + [m for m in GEMINI_FALLBACK_MODELS if m != GEMINI_MODEL]
    last_error: Exception | None = None

    for model in models:
        for attempt in range(1, TRIES_PER_MODEL + 1):
            try:
                response = client.models.generate_content(model=model, contents=prompt, config=config)
                return response.text or ""
            except Exception as exc:
                last_error = exc
                code = getattr(exc, "code", None)
                print(f"LLM ERROR (model={model}, try {attempt}): {exc!r}")
                if code in BAD_KEY_CODES:
                    raise LLMError(str(exc)) from exc       # no point trying other models
                if code in RETRY_CODES and attempt < TRIES_PER_MODEL:
                    time.sleep(1.5 * attempt)              # wait 1.5s, then 3s
                    continue
                break                                       # give up on this model, try the next

    raise LLMError(str(last_error))
