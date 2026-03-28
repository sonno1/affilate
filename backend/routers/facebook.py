from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Post
from schemas import PublishResponse
from services.facebook_service import publish_to_facebook

router = APIRouter(prefix="/posts", tags=["facebook"])


@router.post("/publish/{post_id}", response_model=PublishResponse)
def publish_post(post_id: int, db: Session = Depends(get_db)):
    """Publish an approved post to Facebook Page."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Post must be 'approved' before publishing. Current status: '{post.status}'.",
        )
    if not post.content:
        raise HTTPException(status_code=400, detail="Post has no AI-generated content yet.")

    try:
        fb_post_id = publish_to_facebook(post.content)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Facebook API error: {exc}")

    post.status = "published"
    db.commit()
    db.refresh(post)

    return PublishResponse(
        post_id=post.id,
        fb_post_id=fb_post_id,
        message="Post published to Facebook successfully.",
    )
