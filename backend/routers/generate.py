from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import GenerateResponse
from services.ai_service import generate_pending_posts

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
def trigger_generate(db: Session = Depends(get_db)):
    """Run AI content generation for all pending posts that have no content yet."""
    count = generate_pending_posts(db)
    return GenerateResponse(
        generated=count,
        message=f"Generation complete. {count} post(s) updated.",
    )
