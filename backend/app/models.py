import secrets
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
