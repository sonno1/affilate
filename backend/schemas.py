from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PostBase(BaseModel):
    title: str
    summary: Optional[str] = None
    source_url: str


class PostRead(PostBase):
    id: int
    content: Optional[str] = None
    status: str
    score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PostList(BaseModel):
    items: List[PostRead]
    total: int


class CrawlResponse(BaseModel):
    new_posts: int
    message: str


class CrawlUrlRequest(BaseModel):
    url: str


class CrawlUrlResponse(BaseModel):
    post_id: int
    title: str
    summary: str
    content: str | None = None
    message: str
    # Viral content fields
    viral: Optional[dict] = None  # {post, comment, metadata} from AI
    image_url: Optional[str] = None
    images: Optional[List[str]] = None


class UpdateContentRequest(BaseModel):
    content: str


class GenerateResponse(BaseModel):
    generated: int
    message: str


class PublishResponse(BaseModel):
    post_id: int
    fb_post_id: Optional[str] = None
    fb_comment_id: Optional[str] = None
    message: str


class PublishViralRequest(BaseModel):
    image_url: Optional[str] = None
    comment_text: Optional[str] = None


