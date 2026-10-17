from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_business
from ..models import Business, Conversation, Message, Order, utcnow
from ..safe import esc
from ..timeutil import LOCAL_TZ, local

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DAYS = 14


@router.get("/stats")
def dashboard_stats(business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    real = (Conversation.business_id == business.id, Conversation.channel != "test")

    def count(*conditions) -> int:
        return db.scalar(select(func.count(Conversation.id)).where(*real, *conditions)) or 0

    conversations = count()
    interested = count(or_(Conversation.interested, Conversation.wants_to_buy))
    wants_to_buy = count(Conversation.wants_to_buy)
    confirmed = db.scalar(
        select(func.count(Order.id)).where(Order.business_id == business.id, Order.status == "confirmed")
    ) or 0

    today = local(utcnow()).date()
    first_day = today - timedelta(days=DAYS - 1)
    since_utc = datetime.combine(first_day, time.min, tzinfo=LOCAL_TZ).astimezone(timezone.utc).replace(tzinfo=None)
    rows = db.execute(
        select(Message.conversation_id, Message.created_at)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(*real, Message.role == "customer", Message.created_at >= since_utc)
    ).all()
    per_day: dict = {}
    for conv_id, created in rows:
        per_day.setdefault(local(created).date(), set()).add(conv_id)
    daily = [
        {"date": (first_day + timedelta(days=i)).isoformat(),
         "conversations": len(per_day.get(first_day + timedelta(days=i), ()))}
        for i in range(DAYS)
    ]

    top = db.execute(
        select(Message.product_name, func.count(Message.id).label("n"))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(*real, Message.role == "customer", Message.product_name.is_not(None))
        .group_by(Message.product_name)
        .order_by(func.count(Message.id).desc())
        .limit(5)
    ).all()

    return {
        "conversations": conversations,
        "interested": interested,
        "wants_to_buy": wants_to_buy,
        "confirmed_orders": confirmed,
        "daily": daily,
        "top_products": [{"name": esc(name), "count": n} for name, n in top],
    }
