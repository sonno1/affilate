from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Post
from schemas import PostRead, PostList, UpdateContentRequest

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=PostList)
def list_posts(
    status: Optional[str] = Query(None, description="Filter by status: pending|approved|rejected|published"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Post)
    if status:
        query = query.filter(Post.status == status)
    total = query.count()
    items = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return PostList(items=items, total=total)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    return post


@router.post("/approve/{post_id}", response_model=PostRead)
def approve_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.status not in ("pending",):
        raise HTTPException(status_code=400, detail=f"Cannot approve a post with status '{post.status}'.")
    post.status = "approved"
    db.commit()
    db.refresh(post)
    return post


@router.post("/reject/{post_id}", response_model=PostRead)
def reject_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.status = "rejected"
    db.commit()
    db.refresh(post)
    return post


@router.put("/{post_id}/content", response_model=PostRead)
def update_post_content(post_id: int, body: UpdateContentRequest, db: Session = Depends(get_db)):
    """Update post content (for user review/edit before publishing)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Không thể sửa bài đã đăng.")
    post.content = body.content.strip()
    db.commit()
    db.refresh(post)
    return post
