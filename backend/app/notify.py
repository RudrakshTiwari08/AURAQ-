import httpx

from .config import TELEGRAM_BOT_TOKEN


def send_telegram(chat_id, text: str) -> bool:
    """Send a plain-text Telegram message. Never raises, never prints the bot token."""
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        r = httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": str(chat_id), "text": text[:4000]},
            timeout=10,
        )
        return r.status_code == 200
    except Exception as exc:       # only the type: the message could contain the URL (and token)
        print("TELEGRAM SEND FAILED:", type(exc).__name__)
        return False


def notify_owner(business, text: str) -> bool:
    return send_telegram(business.owner_telegram_chat_id, text)
