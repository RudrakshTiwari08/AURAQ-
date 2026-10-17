from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import SECRET_KEY, TOKEN_EXPIRE_DAYS

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(business_id: int) -> str:
    payload = {
        "sub": str(business_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    """Return the business id inside a valid token, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


# --- Telegram "connect my alerts" link: signed, so nobody can guess another owner's ---
import hashlib
import hmac


def owner_connect_code(business_id: int) -> str:
    sig = hmac.new(SECRET_KEY.encode(), f"owner:{business_id}".encode(), hashlib.sha256).hexdigest()[:24]
    return f"{business_id}-{sig}"


def verify_owner_code(code: str) -> int | None:
    """Return the business id if the code is genuine, else None."""
    try:
        id_part, _ = code.split("-", 1)
        business_id = int(id_part)
    except (ValueError, AttributeError):
        return None
    if hmac.compare_digest(owner_connect_code(business_id), code):
        return business_id
    return None
