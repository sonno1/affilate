import secrets
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
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
def redirect_shortlink(token: str, db: Session = Depends(get_db)):
    """Redirect tới affiliate URL ứng với token. Không trả về URL trong response body."""
    # Validate token format (chỉ hex)
    if not token.isalnum() or len(token) > 32:
        raise HTTPException(status_code=404, detail="Link không tồn tại.")

    entry = db.query(ShortLink).filter(ShortLink.token == token).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Link không tồn tại hoặc đã hết hạn.")

    return RedirectResponse(url=entry.target_url, status_code=302)


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
