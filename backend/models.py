from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(512), nullable=False)
    summary = Column(Text, nullable=True)         # raw summary from RSS
    content = Column(Text, nullable=True)          # AI-generated Facebook post
    source_url = Column(String(1024), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="pending")
    # status values: pending | approved | rejected | published
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
