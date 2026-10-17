from fastapi import APIRouter, Depends

from ..config import TELEGRAM_BOT_USERNAME
from ..deps import get_current_business
from ..models import Business
from ..security import owner_connect_code

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.get("/connect-link")
def connect_link(business: Business = Depends(get_current_business)):
    """Link the owner taps once so the bot can send them alerts."""
    if not TELEGRAM_BOT_USERNAME:
        return {"link": ""}
    return {"link": f"https://t.me/{TELEGRAM_BOT_USERNAME}?start=owner_{owner_connect_code(business.id)}"}
