import os
import feedparser
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import Post


def get_rss_urls() -> list[str]:
    raw = os.getenv("RSS_URLS", "")
    return [url.strip() for url in raw.split(",") if url.strip()]


def crawl_rss(db: Session) -> int:
    """Crawl all configured RSS feeds and save new posts to DB. Returns count of new posts."""
    urls = get_rss_urls()
    if not urls:
        return 0

    new_count = 0
    for url in urls:
        feed = feedparser.parse(url)
        for entry in feed.entries:
            link = entry.get("link", "")
            if not link:
                continue

            title = entry.get("title", "").strip()
            summary = entry.get("summary", entry.get("description", "")).strip()

            post = Post(
                title=title,
                summary=summary,
                source_url=link,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            try:
                db.add(post)
                db.commit()
                db.refresh(post)
                new_count += 1
            except IntegrityError:
                db.rollback()  # duplicate source_url — skip silently

    return new_count
