import secrets
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    """Current UTC time WITHOUT a timezone tag, so SQLite and Postgres store the same thing."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_link_code() -> str:
    # goes into the Telegram deep link: t.me/<bot>?start=<code>
    return secrets.token_urlsafe(8)


class Business(Base):
    """One row = one owner + their business (simple for now: one owner per business)."""
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))

    name: Mapped[str] = mapped_column(String(80))
    type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text, default="")
    hours: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    contact: Mapped[str] = mapped_column(String(200), default="")

    link_code: Mapped[str] = mapped_column(String(32), unique=True, default=new_link_code)
    owner_telegram_chat_id: Mapped[str | None] = mapped_column(String(32), default=None)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    products: Mapped[list["Product"]] = relationship(
        back_populates="business", cascade="all, delete-orphan"
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[float]
    category: Mapped[str] = mapped_column(String(60), default="")

    business: Mapped["Business"] = relationship(back_populates="products")
    variants: Mapped[list["Variant"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class Variant(Base):
    """A t-shirt is one Product with many Variants (size + colour + stock)."""
    __tablename__ = "variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    size: Mapped[str] = mapped_column(String(20), default="")
    colour: Mapped[str] = mapped_column(String(40), default="")
    stock: Mapped[int] = mapped_column(default=0)

    product: Mapped["Product"] = relationship(back_populates="variants")


class FAQ(Base):
    """One question/answer the assistant may use. Always belongs to one business."""
    __tablename__ = "faqs"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    question: Mapped[str] = mapped_column(String(300))
    answer: Mapped[str] = mapped_column(Text)


class ChatBinding(Base):
    """Which shop a Telegram chat is currently talking to (set by the shop's link)."""
    __tablename__ = "chat_bindings"

    chat_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)


class Conversation(Base):
    """One ongoing chat between one customer and one business."""
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("business_id", "channel", "external_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    channel: Mapped[str] = mapped_column(String(10))          # "telegram" or "test"
    external_id: Mapped[str] = mapped_column(String(40))      # Telegram chat id
    customer_name: Mapped[str] = mapped_column(String(80), default="")
    customer_username: Mapped[str] = mapped_column(String(40), default="")
    escalated: Mapped[bool] = mapped_column(default=False)
    owner_alerted: Mapped[bool] = mapped_column(default=False)
    interested: Mapped[bool] = mapped_column(default=False)
    wants_to_buy: Mapped[bool] = mapped_column(default=False)
    state: Mapped[str] = mapped_column(Text, default="")      # JSON: order being collected
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_message_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.id"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(12))             # "customer" or "assistant"
    text: Mapped[str] = mapped_column(Text)
    product_name: Mapped[str | None] = mapped_column(String(120), default=None)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    customer_name: Mapped[str] = mapped_column(String(80))
    contact: Mapped[str] = mapped_column(String(40))
    product_id: Mapped[int | None] = mapped_column(default=None)   # no FK: order survives product deletion
    product: Mapped[str] = mapped_column(String(120))
    size: Mapped[str] = mapped_column(String(20), default="")
    colour: Mapped[str] = mapped_column(String(40), default="")
    quantity: Mapped[int]
    unit_price: Mapped[float]
    status: Mapped[str] = mapped_column(String(12), default="pending", index=True)  # pending/confirmed/rejected
    created_at: Mapped[datetime] = mapped_column(default=utcnow, index=True)
    decided_at: Mapped[datetime | None] = mapped_column(default=None)
