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


class GenerateResponse(BaseModel):
    generated: int
    message: str


class PublishResponse(BaseModel):
    post_id: int
    fb_post_id: Optional[str] = None
    message: str


# ---------------------------------------------------------------------------
# GitHub schemas
# ---------------------------------------------------------------------------

class GitHubConfigIn(BaseModel):
    username: str
    token: Optional[str] = None   # Omit to keep existing token unchanged
    repo: str
    branch: str = "main"


class GitHubConfigOut(BaseModel):
    username: str
    repo: str
    branch: str
    token_set: bool


class GitHubPushIn(BaseModel):
    commit_message: str = "chore: update via AI Affiliate dashboard"


class GitHubPushResult(BaseModel):
    success: bool
    logs: List[str]
    repo_url: str


class GitHubStatusOut(BaseModel):
    is_repo: bool
    branch: str
    status: str
    recent_commits: List[str]
