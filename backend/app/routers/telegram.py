import hmac

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from ..config import TELEGRAM_BOT_USERNAME
from ..deps import get_current_business
from ..models import Business
from ..security import owner_connect_code, telegram_webhook_secret
from ..telegram_bot import process_update

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.get("/connect-link")
def connect_link(business: Business = Depends(get_current_business)):
    """Link the owner taps once so the bot can send them alerts."""
    if not TELEGRAM_BOT_USERNAME:
        return {"link": ""}
    return {"link": f"https://t.me/{TELEGRAM_BOT_USERNAME}?start=owner_{owner_connect_code(business.id)}"}


def handle_update_safely(update: dict) -> None:
    try:
        process_update(update)
    except Exception as exc:                 # one bad message must never break the site
        print("Error while handling a Telegram update:", type(exc).__name__)


@router.post("/webhook")
async def telegram_webhook(request: Request, background: BackgroundTasks):
    """Telegram calls this for every message when the site is deployed (no polling process needed)."""
    sent = request.headers.get("x-telegram-bot-api-secret-token", "")
    if not hmac.compare_digest(sent.encode(), telegram_webhook_secret().encode()):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        update = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if isinstance(update, dict):
        background.add_task(handle_update_safely, update)    # answer Telegram immediately, work afterwards
    return {"ok": True}
