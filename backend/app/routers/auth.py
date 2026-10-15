from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Business
from ..schemas import LoginIn, SignupIn, TokenOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut)
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()

    if db.scalar(select(Business).where(Business.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    business = Business(
        owner_name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        name=data.business_name,
        type=data.business_type,
    )
    db.add(business)
    try:
        db.commit()
    except IntegrityError:  # two signups with the same email at the same instant
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    return {"token": create_token(business.id)}


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    business = db.scalar(select(Business).where(Business.email == email))

    # same message for "no such email" and "wrong password": do not reveal which emails exist
    # status 400 on purpose: the frontend treats 401 as "session expired" and redirects
    if business is None or not verify_password(data.password, business.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")

    return {"token": create_token(business.id)}
