from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import SIGNUP_LIMIT_PER_HOUR
from ..database import get_db
from ..models import Business
from ..ratelimit import SlidingWindow, client_ip, too_many
from ..schemas import LoginIn, SignupIn, TokenOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

signup_per_ip = SlidingWindow(SIGNUP_LIMIT_PER_HOUR, 3600)
signup_global = SlidingWindow(SIGNUP_LIMIT_PER_HOUR * 6, 3600)
login_per_account = SlidingWindow(10, 900)     # 10 tries per 15 minutes for one email from one address
login_per_ip = SlidingWindow(40, 900)


@router.post("/signup", response_model=TokenOut)
def signup(data: SignupIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if not signup_per_ip.allow(ip) or not signup_global.allow("all"):
        raise too_many("Too many sign-ups from here. Please try again in an hour.")
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
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    email = data.email.lower().strip()
    if not login_per_account.allow(f"{ip}|{email}") or not login_per_ip.allow(ip):
        raise too_many("Too many login attempts. Please wait 15 minutes and try again.")
    business = db.scalar(select(Business).where(Business.email == email))

    # same message for "no such email" and "wrong password": do not reveal which emails exist
    # status 400 on purpose: the frontend treats 401 as "session expired" and redirects
    if business is None or not verify_password(data.password, business.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")

    return {"token": create_token(business.id)}
