from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Business
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_business(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Business:
    """Put this in any route that needs a logged-in owner."""
    if creds is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    business_id = decode_token(creds.credentials)
    business = db.get(Business, business_id) if business_id else None
    if business is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    return business
