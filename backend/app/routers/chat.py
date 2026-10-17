from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_business
from ..engine import customer_label, get_or_create_conversation, handle_message
from ..models import Business, Conversation
from ..safe import esc
from ..schemas_chat import TestChatIn, TestChatOut
from ..timeutil import fmt_clock

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/test-chat", response_model=TestChatOut)
def test_chat(data: TestChatIn, business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    """The owner talks to their own assistant. Kept apart from real customers' stats."""
    conv = get_or_create_conversation(db, business, "test", str(business.id))
    reply = handle_message(db, business, conv, data.message)
    return {"reply": esc(reply)}


@router.get("/conversations")
def list_conversations(business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Conversation)
        .where(Conversation.business_id == business.id, Conversation.channel != "test")
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.last_message_at.desc())
        .limit(50)
    ).all()
    return [
        {
            "id": c.id,
            "customer_label": esc(customer_label(c)),
            "escalated": c.escalated,
            "last_message_at": fmt_clock(c.last_message_at),
            "messages": [
                # esc(): a customer could type <script>...; the dashboard must never run it
                {"role": m.role, "text": esc(m.text), "time": fmt_clock(m.created_at)}
                for m in c.messages[-60:]
            ],
        }
        for c in rows
    ]
