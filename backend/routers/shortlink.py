import secrets
from html import escape
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import ShortLink

router = APIRouter(tags=["shortlink"])

TOKEN_LEN = 8  # 8 ký tự hex → 4 tỷ khả năng, đủ cho use-case này


class ShortenRequest(BaseModel):
    url: str


class ShortenResponse(BaseModel):
    short_token: str


class ShortLinkRow(BaseModel):
    id: int
    token: str
    short_url: str
    target_url: str
    created_at: str

    model_config = {"from_attributes": True}


@router.post("/shorten", response_model=ShortenResponse)
def shorten(body: ShortenRequest, db: Session = Depends(get_db)):
    """Lưu affiliate URL và trả về token ngắn. URL gốc không bao giờ lộ ra frontend."""
    url = body.url.strip()

    # Validate: chỉ chấp nhận URL Shopee an_redir
    if not url.startswith("https://s.shopee.vn/an_redir"):
        raise HTTPException(status_code=400, detail="URL không hợp lệ.")

    # Giới hạn độ dài để tránh lưu payload cực lớn
    if len(url) > 2048:
        raise HTTPException(status_code=400, detail="URL quá dài.")

    # Tạo token duy nhất, tối đa 5 lần thử
    for _ in range(5):
        token = secrets.token_hex(TOKEN_LEN // 2)
        exists = db.query(ShortLink).filter(ShortLink.token == token).first()
        if not exists:
            break
    else:
        raise HTTPException(status_code=500, detail="Không tạo được token, thử lại.")

    entry = ShortLink(token=token, target_url=url)
    db.add(entry)
    db.commit()

    return {"short_token": token}


@router.get("/r/{token}")
def redirect_shortlink(token: str, request: Request, db: Session = Depends(get_db)):
    """Trả về HTML page với OG tags + JS redirect. Facebook scraper đọc được OG data,
    người dùng thì redirect ngay lập tức qua JS."""
    # Validate token format (chỉ hex)
    if not token.isalnum() or len(token) > 32:
        raise HTTPException(status_code=404, detail="Link không tồn tại.")

    entry = db.query(ShortLink).filter(ShortLink.token == token).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Link không tồn tại hoặc đã hết hạn.")

    safe_url = escape(entry.target_url, quote=True)
    canonical = str(request.url)
    safe_canonical = escape(canonical, quote=True)

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Shopee - Sản phẩm khuyến mãi</title>
  <!-- Open Graph — để Facebook hiện link card -->
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="{safe_canonical}">
  <meta property="og:title"       content="Shopee - Sản phẩm khuyến mãi">
  <meta property="og:description" content="Nhấn để xem và mua sản phẩm với giá ưu đãi trên Shopee.">
  <meta property="og:image"       content="https://cf.shopee.vn/file/sg-11134004-7rdwy-m1e419s9q8f91f">
  <meta property="og:site_name"   content="Shopee">
  <!-- Không để bot lập chỉ mục -->
  <meta name="robots" content="noindex,nofollow">
  <!-- Fallback redirect nếu JS tắt -->
  <meta http-equiv="refresh" content="0;url={safe_url}">
</head>
<body>
  <p>Đang chuyển hướng... <a href="{safe_url}">Nhấn vào đây</a> nếu không tự chuyển.</p>
  <script>window.location.replace("{safe_url}");</script>
</body>
</html>"""

    return HTMLResponse(content=html, status_code=200)


@router.get("/shortlinks", response_model=list[ShortLinkRow])
def list_shortlinks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """[Admin] Liệt kê tất cả shortlink đã lưu trong DB."""
    rows = db.query(ShortLink).order_by(ShortLink.id.desc()).offset(skip).limit(limit).all()
    # Xây dựng short_url dựa trên host header không có sẵn trong SQLite,
    # nên trả token để frontend tự ghép
    return [
        ShortLinkRow(
            id=r.id,
            token=r.token,
            short_url=f"/r/{r.token}",
            target_url=r.target_url,
            created_at=r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        )
        for r in rows
    ]
