import os
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from services.rss_crawler import crawl_rss


def _auto_crawl_job():
    db = SessionLocal()
    try:
        count = crawl_rss(db)
        print(f"[Scheduler] Auto-crawl complete: {count} new posts.")
    except Exception as exc:
        print(f"[Scheduler] Auto-crawl error: {exc}")
    finally:
        db.close()


def create_scheduler() -> BackgroundScheduler:
    interval_minutes = int(os.getenv("AUTO_CRAWL_INTERVAL_MINUTES", "30"))
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _auto_crawl_job,
        trigger="interval",
        minutes=interval_minutes,
        id="auto_crawl",
    )
    return scheduler
