from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_business
from ..engine import inr, pretty_variant
from ..models import Business, Conversation, Message, Order, Product, utcnow
from ..notify import send_telegram
from ..safe import esc
from ..timeutil import fmt_datetime

router = APIRouter(prefix="/api/orders", tags=["orders"])


def order_out(o: Order) -> dict:
    return {
        "id": o.id,
        "customer_name": esc(o.customer_name),
        "contact": esc(o.contact),
        "product": esc(o.product),
        "size": esc(o.size),
        "colour": esc(o.colour),
        "quantity": o.quantity,
        "unit_price": o.unit_price,
        "total": o.unit_price * o.quantity,
        "status": o.status,
        "created_at": fmt_datetime(o.created_at),
    }


def get_owned_order(db: Session, business: Business, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None or order.business_id != business.id:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


def tell_customer(db: Session, order: Order, business: Business, text: str) -> None:
    """Log the message in the chat, and send it on Telegram if the customer came from there."""
    conv = db.get(Conversation, order.conversation_id)
    if conv is None:
        return
    db.add(Message(conversation_id=conv.id, role="assistant", text=text))
    conv.last_message_at = utcnow()
    if conv.channel == "telegram":
        send_telegram(conv.external_id, text)


@router.get("")
def list_orders(business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Order).where(Order.business_id == business.id).order_by(Order.id.desc()).limit(200)
    ).all()
    return [order_out(o) for o in rows]


@router.post("/{order_id}/confirm")
def confirm_order(order_id: int, business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    order = get_owned_order(db, business, order_id)
    if order.status != "pending":
        raise HTTPException(status_code=409, detail=f"This order was already {order.status}.")

    product = db.get(Product, order.product_id) if order.product_id else None
    variant = None
    if product and product.business_id == business.id:
        variant = next((v for v in product.variants
                        if v.size.lower() == order.size.lower() and v.colour.lower() == order.colour.lower()), None)
    if variant is None:
        raise HTTPException(status_code=409, detail="This item no longer exists in your catalog. Re-add it, or reject the order.")
    if variant.stock < order.quantity:
        raise HTTPException(status_code=409, detail=f"Not enough stock: only {variant.stock} left. Update your stock or reject the order.")

    variant.stock -= order.quantity
    order.status = "confirmed"
    order.decided_at = utcnow()
    tell_customer(
        db, order, business,
        f"Good news! {business.name} confirmed your order #{order.id}: {order.quantity} × {order.product}"
        f"{pretty_variant(order.size, order.colour)}. Total {inr(order.unit_price * order.quantity)}. "
        "The owner will contact you about payment and delivery.",
    )
    db.commit()
    return order_out(order)


@router.post("/{order_id}/reject")
def reject_order(order_id: int, business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    order = get_owned_order(db, business, order_id)
    if order.status != "pending":
        raise HTTPException(status_code=409, detail=f"This order was already {order.status}.")
    order.status = "rejected"
    order.decided_at = utcnow()
    tell_customer(
        db, order, business,
        f"Sorry, {business.name} couldn't fulfil order #{order.id} ({order.product}). "
        "You can ask me about other options or contact the shop directly.",
    )
    db.commit()
    return order_out(order)
