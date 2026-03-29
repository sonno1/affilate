import sys
import os

# Đưa thư mục backend vào Python path để FastAPI tìm được các module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from main import app  # noqa: E402


class StripApiPrefix(BaseHTTPMiddleware):
    """Vercel routing thêm prefix /api/* → strip prefix trước khi FastAPI xử lý."""
    async def dispatch(self, request: Request, call_next):
        path = request.scope.get("path", "")
        if path.startswith("/api/"):
            stripped = path[4:]  # bỏ '/api'
            request.scope["path"] = stripped
            request.scope["raw_path"] = stripped.encode()
        return await call_next(request)


app.add_middleware(StripApiPrefix)
