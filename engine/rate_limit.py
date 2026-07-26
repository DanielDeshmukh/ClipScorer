import time
import threading
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

_lock = threading.Lock()
_requests: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT = 30
WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit: int = RATE_LIMIT, window: int = WINDOW_SECONDS):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window = window

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        with _lock:
            _requests[client_ip] = [
                t for t in _requests[client_ip] if now - t < self.window
            ]
            if len(_requests[client_ip]) >= self.rate_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Max {self.rate_limit} requests per {self.window}s.",
                )
            _requests[client_ip].append(now)

        return await call_next(request)
