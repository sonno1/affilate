from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Post
from schemas import CrawlResponse, CrawlUrlRequest, CrawlUrlResponse
from services.rss_crawler import crawl_rss
from services.url_crawler import crawl_url
from services.ai_service import generate_content_for_post

router = APIRouter(prefix="/crawl", tags=["crawl"])


@router.get("", response_model=CrawlResponse)
def trigger_crawl(db: Session = Depends(get_db)):
    """Manually trigger RSS crawl."""
    new_posts = crawl_rss(db)
    return CrawlResponse(
        new_posts=new_posts,
        message=f"Crawl complete. {new_posts} new post(s) added.",
    )


@router.post("/url", response_model=CrawlUrlResponse)
def crawl_single_url(body: CrawlUrlRequest, db: Session = Depends(get_db)):
    """Crawl a single URL, extract content, generate AI summary, return for review."""
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL không được để trống.")
    if len(url) > 2048:
        raise HTTPException(status_code=400, detail="URL quá dài.")

    # Check duplicate
    existing = db.query(Post).filter(Post.source_url == url).first()
    if existing:
        return CrawlUrlResponse(
            post_id=existing.id,
            title=existing.title,
            summary=existing.summary or "",
            content=existing.content,
            message="URL này đã được crawl trước đó.",
        )

    # Crawl
    try:
        data = crawl_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể truy cập URL: {exc}")

    # Save to DB
    post = Post(
        title=data["title"],
        summary=data["text"],
        source_url=url,
        status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Generate AI content
    try:
        post.content = generate_content_for_post(post)
        db.commit()
        db.refresh(post)
    except Exception:
        pass  # AI failure is non-fatal; user can still see raw summary

    return CrawlUrlResponse(
        post_id=post.id,
        title=post.title,
        summary=post.summary or "",
        content=post.content,
        message="Crawl và tạo nội dung thành công.",
    )
