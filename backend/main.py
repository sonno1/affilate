import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env từ thư mục gốc project (một cấp trên backend/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

from database import engine, Base
from routers import crawl, generate, posts, facebook, shopee, shortlink
from services.scheduler import create_scheduler

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

_scheduler = create_scheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Vercel là serverless — không hỗ trợ background scheduler
    if not os.getenv("VERCEL"):
        _scheduler.start()
    yield
    if not os.getenv("VERCEL") and _scheduler.running:
        _scheduler.shutdown(wait=False)


app = FastAPI(
    title="Value Content Automation API",
    description="Crawl RSS → AI generate Facebook posts → approval → publish",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow local React dev server
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crawl.router)
app.include_router(generate.router)
app.include_router(posts.router)
app.include_router(facebook.router)
app.include_router(shopee.router)
app.include_router(shortlink.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "message": "Value Content Automation API is running."}
