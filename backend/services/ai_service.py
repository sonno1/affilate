import os
import json
from pathlib import Path
from sqlalchemy.orm import Session
from models import Post

# ---------------------------------------------------------------------------
# Provider clients (lazy-loaded singletons)
# ---------------------------------------------------------------------------
_openai_client = None
_gemini_client = None
_anthropic_client = None


def _get_provider() -> str:
    """Return active AI provider: openai | gemini | anthropic."""
    return os.getenv("AI_PROVIDER", "openai").lower().strip()


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        _gemini_client = genai
    return _gemini_client


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _anthropic_client


# ---------------------------------------------------------------------------
# Unified chat completion — same interface, any provider
# ---------------------------------------------------------------------------
def _chat(system: str, user: str, max_tokens: int = 512, temperature: float = 0.9) -> str:
    """Send system + user message to the active AI provider. Returns raw text."""
    provider = _get_provider()

    if provider == "gemini":
        genai = _get_gemini()
        model = genai.GenerativeModel(
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            system_instruction=system,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        resp = model.generate_content(user)
        return resp.text.strip()

    elif provider == "anthropic":
        client = _get_anthropic()
        resp = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text.strip()

    else:  # openai (default)
        client = _get_openai()
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Load viral prompt from .md file
# ---------------------------------------------------------------------------
_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "viral_content.md"

def _load_viral_prompt() -> str:
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text(encoding="utf-8")
    # Fallback nếu file bị thiếu
    return (
        "Bạn là AI chuyên viết content Facebook viral bằng tiếng Việt. "
        "Viết ngắn gọn 100-150 ký tự, có hook + emoji + CTA kéo comment. "
        "Luôn trả JSON đúng format."
    )


VIRAL_SYSTEM_PROMPT = _load_viral_prompt()

VIRAL_USER_TEMPLATE = """Phân tích nội dung sau và tạo bài đăng Facebook viral.

Tiêu đề: {title}
Nội dung: {content}
Link gốc: {source_link}
Có ảnh: {has_image}
URL ảnh: {image_url}

QUY TẮC CAPTION:
- Công thức: HOOK + EMOTION + CURIOSITY + CTA
- Độ dài: 80–150 ký tự
- HOOK mạnh ngay đầu (gây sốc / bất ngờ / tò mò)
- 1–2 emoji cảm xúc (😱😳🔥🚨😂🐶🐱❤️)
- KHÔNG nói hết nội dung, giữ tò mò
- CTA bắt buộc kéo xuống comment ("Chi tiết dưới comment 👇")
- Auto style theo content_type:
  + news → tin nóng
  + drama → tranh cãi
  + funny → hài hước
  + animal → dễ thương
  + other → tổng hợp

Trả về ĐÚNG JSON format (không kèm markdown code block):
{{
  "post": {{
    "type": "image_post" hoặc "background_post",
    "caption": "caption viral 80-150 ký tự theo công thức HOOK+EMOTION+CURIOSITY+CTA",
    "image_url": "URL ảnh nếu có, null nếu không",
    "background_title": "TIÊU ĐỀ ALL CAPS 5-10 từ nếu background_post, null nếu image_post"
  }},
  "comment": {{
    "text": "Chi tiết tại đây 👇\\n{source_link}"
  }},
  "metadata": {{
    "content_type": "news | drama | funny | animal | other"
  }}
}}"""

# Legacy simple prompt (kept for RSS batch generation)
SIMPLE_SYSTEM_PROMPT = (
    "Bạn là copywriter chuyên viết nội dung Facebook viral cho trang tin tức. "
    "Viết ngắn gọn, súc tích, hấp dẫn."
)

SIMPLE_USER_TEMPLATE = """Tóm tắt nội dung sau thành bài đăng Facebook:
- Dưới 100 chữ
- Mở đầu bằng câu hook gây tò mò
- Kết bài bằng CTA (kêu gọi hành động)
- Viết bằng tiếng Việt, giọng thân thiện

Tiêu đề: {title}
Nội dung: {summary}
"""


def generate_viral_content(title: str, content: str, source_link: str,
                           has_image: bool = False, image_url: str | None = None) -> dict:
    """Generate viral Facebook content using the viral system prompt.
    Returns parsed JSON dict with post/comment/metadata structure.
    """
    prompt = VIRAL_USER_TEMPLATE.format(
        title=title,
        content=content[:3000] if content else title,
        source_link=source_link,
        has_image="Có" if has_image else "Không",
        image_url=image_url or "không có",
    )
    raw = _chat(VIRAL_SYSTEM_PROMPT, prompt, max_tokens=512, temperature=0.9)

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: create a basic structure from raw text
        result = {
            "post": {
                "type": "background_post",
                "caption": raw[:150],
                "image_url": image_url,
                "background_title": title[:50].upper() if not has_image else None,
            },
            "comment": {
                "text": f"Chi tiết tại đây 👇\n{source_link}",
            },
            "metadata": {
                "content_type": "other",
            },
        }

    # Ensure comment always has source link
    if "comment" in result:
        if source_link not in result["comment"].get("text", ""):
            result["comment"]["text"] = f"Chi tiết tại đây 👇\n{source_link}"

    return result


def generate_content_for_post(post: Post) -> str:
    """Generate a Facebook post from the RSS entry (simple mode)."""
    prompt = SIMPLE_USER_TEMPLATE.format(
        title=post.title,
        summary=post.summary or post.title,
    )
    return _chat(SIMPLE_SYSTEM_PROMPT, prompt, max_tokens=256, temperature=0.8)


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
