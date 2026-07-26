import time
import threading
from collections import defaultdict
from starlette.types import ASGIApp, Receive, Scope, Send

_lock = threading.Lock()
_requests: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT = 120
WINDOW_SECONDS = 60


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp, rate_limit: int = RATE_LIMIT, window: int = WINDOW_SECONDS):
        self.app = app
        self.rate_limit = rate_limit
        self.window = window

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if path.startswith("/health") or path.startswith("/api/crawl/progress"):
            return await self.app(scope, receive, send)

        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        now = time.time()

        with _lock:
            _requests[client_ip] = [
                t for t in _requests[client_ip] if now - t < self.window
            ]
            if len(_requests[client_ip]) >= self.rate_limit:
                from fastapi.responses import JSONResponse
                response = JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded. Max {self.rate_limit} requests per {self.window}s."},
                )
                return await response(scope, receive, send)
            _requests[client_ip].append(now)

        return await self.app(scope, receive, send)
