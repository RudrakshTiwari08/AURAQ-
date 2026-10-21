"""Tiny in-memory rate limiter. Enough to stop casual abuse of signup and login on a public site."""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class SlidingWindow:
    def __init__(self, limit: int, seconds: int):
        self.limit, self.seconds = limit, seconds
        self.hits: dict[str, deque] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        q = self.hits[key]
        while q and now - q[0] > self.seconds:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


def client_ip(request: Request) -> str:
    """Behind a host's proxy the real visitor address is in X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for", "")
    return (forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown"))


def too_many(detail: str = "Too many attempts. Please wait a while and try again.") -> HTTPException:
    return HTTPException(status_code=429, detail=detail)
