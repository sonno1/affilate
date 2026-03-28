from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import CrawlResponse
from services.rss_crawler import crawl_rss

router = APIRouter(prefix="/crawl", tags=["crawl"])


@router.get("", response_model=CrawlResponse)
def trigger_crawl(db: Session = Depends(get_db)):
    """Manually trigger RSS crawl."""
    new_posts = crawl_rss(db)
    return CrawlResponse(
        new_posts=new_posts,
        message=f"Crawl complete. {new_posts} new post(s) added.",
    )
