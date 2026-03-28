import os
from openai import OpenAI
from sqlalchemy.orm import Session
from models import Post

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = (
    "Bạn là copywriter chuyên viết nội dung Facebook viral cho trang tin tức. "
    "Viết ngắn gọn, súc tích, hấp dẫn."
)

USER_PROMPT_TEMPLATE = """Tóm tắt nội dung sau thành bài đăng Facebook:
- Dưới 100 chữ
- Mở đầu bằng câu hook gây tò mò
- Kết bài bằng CTA (kêu gọi hành động)
- Viết bằng tiếng Việt, giọng thân thiện

Tiêu đề: {title}
Nội dung: {summary}
"""


def generate_content_for_post(post: Post) -> str:
    """Call OpenAI to generate a Facebook post from the RSS entry."""
    prompt = USER_PROMPT_TEMPLATE.format(
        title=post.title,
        summary=post.summary or post.title,
    )
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=256,
        temperature=0.8,
    )
    return response.choices[0].message.content.strip()


def generate_pending_posts(db: Session) -> int:
    """Generate AI content for all pending posts that have no content yet. Returns count."""
    posts = (
        db.query(Post)
        .filter(Post.status == "pending", Post.content.is_(None))
        .all()
    )
    count = 0
    for post in posts:
        try:
            post.content = generate_content_for_post(post)
            db.commit()
            count += 1
        except Exception as exc:
            db.rollback()
            print(f"[AI] Failed for post {post.id}: {exc}")
    return count
