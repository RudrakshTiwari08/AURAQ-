"""Customers are strangers. Anything they type is untrusted."""
import html
import re

_BAD_NAME_CHARS = re.compile(r"[^\w .'\-]", re.UNICODE)


def esc(text: str) -> str:
    """Make text safe to place inside the dashboard's HTML (blocks <script> etc.)."""
    return html.escape(text or "", quote=False)


def clean_name(value, max_len: int = 60) -> str | None:
    if not isinstance(value, str):
        return None
    value = _BAD_NAME_CHARS.sub("", value)
    value = re.sub(r"\s+", " ", value).strip()[:max_len].strip()
    if len(value) < 2 or not any(c.isalpha() for c in value):
        return None
    return value


def clean_username(value) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"[^A-Za-z0-9_]", "", value)[:32]


def valid_contact(value) -> str | None:
    """A phone number or a Telegram @username. Anything else is rejected."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    compact = re.sub(r"[\s\-()]", "", value)
    if re.fullmatch(r"\+?\d{7,15}", compact):
        return compact
    handle = value.lstrip("@")
    if re.fullmatch(r"[A-Za-z0-9_]{5,32}", handle) and not handle.isdigit():
        return "@" + handle
    return None
