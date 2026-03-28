import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import engine, Base
from routers import crawl, generate, posts, facebook, github
from services.scheduler import create_scheduler

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

_scheduler = create_scheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _scheduler.start()
    yield
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
app.include_router(github.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "message": "Value Content Automation API is running."}
