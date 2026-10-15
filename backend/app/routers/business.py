from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import TELEGRAM_BOT_USERNAME
from ..database import get_db
from ..deps import get_current_business
from ..models import Business
from ..schemas import BusinessOut, BusinessUpdate

router = APIRouter(prefix="/api", tags=["business"])


def to_out(business: Business) -> dict:
    # Without a bot username the link stays empty, and the frontend shows
    # "Your link is being prepared" instead of a broken QR code.
    link = ""
    if TELEGRAM_BOT_USERNAME:
        link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={business.link_code}"
    return {
        "id": business.id,
        "name": business.name,
        "type": business.type,
        "description": business.description,
        "hours": business.hours,
        "city": business.city,
        "contact": business.contact,
        "telegram_link": link,
    }


@router.get("/business", response_model=BusinessOut)
def get_business(business: Business = Depends(get_current_business)):
    return to_out(business)


@router.put("/business", response_model=BusinessOut)
def update_business(
    data: BusinessUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    # only change the fields the frontend actually sent
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(business, field, value.strip())
    db.commit()
    db.refresh(business)
    return to_out(business)
