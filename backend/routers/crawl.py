from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Post
from schemas import CrawlResponse, CrawlUrlRequest, CrawlUrlResponse
from services.rss_crawler import crawl_rss
from services.url_crawler import crawl_url
from services.ai_service import generate_viral_content

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
    """Crawl a single URL, extract content + images, generate viral AI content."""
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL không được để trống.")
    if len(url) > 2048:
        raise HTTPException(status_code=400, detail="URL quá dài.")

    # Crawl
    try:
        data = crawl_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể truy cập URL: {exc}")

    # Check duplicate
    existing = db.query(Post).filter(Post.source_url == url).first()
    if existing:
        # Re-generate viral content cho post cũ
        viral = None
        try:
            viral = generate_viral_content(
                title=existing.title,
                content=existing.summary or existing.title,
                source_link=url,
                has_image=bool(data.get("image_url")),
                image_url=data.get("image_url"),
            )
            existing.content = viral.get("post", {}).get("caption", existing.content)
            db.commit()
            db.refresh(existing)
        except Exception:
            pass
        return CrawlUrlResponse(
            post_id=existing.id,
            title=existing.title,
            summary=existing.summary or "",
            content=existing.content,
            message="URL này đã được crawl trước đó.",
            viral=viral,
            image_url=data.get("image_url"),
            images=data.get("images", []),
        )

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

    # Generate viral AI content
    viral = None
    try:
        viral = generate_viral_content(
            title=data["title"],
            content=data["text"],
            source_link=url,
            has_image=bool(data.get("image_url")),
            image_url=data.get("image_url"),
        )
        post.content = viral.get("post", {}).get("caption", "")
        db.commit()
        db.refresh(post)
    except Exception:
        pass  # AI failure is non-fatal

    return CrawlUrlResponse(
        post_id=post.id,
        title=post.title,
        summary=post.summary or "",
        content=post.content,
        message="Crawl và tạo nội dung thành công.",
        viral=viral,
        image_url=data.get("image_url"),
        images=data.get("images", []),
    )
