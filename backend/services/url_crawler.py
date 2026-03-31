"""Crawl a single URL and extract title + text content."""

import requests
from bs4 import BeautifulSoup

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

# Các tag không chứa nội dung hữu ích
_STRIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form", "noscript", "svg", "iframe"}

# Giới hạn tối đa text trích xuất (ký tự)
_MAX_TEXT_LEN = 4000


def crawl_url(url: str) -> dict:
    """Fetch a webpage, return {'title': ..., 'text': ...}.

    Raises ValueError on invalid URL or fetch failure.
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL phải bắt đầu bằng http:// hoặc https://")

    resp = requests.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove unwanted tags
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    # Title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else "Không có tiêu đề"

    # Main text — prefer <article>, fallback to <body>
    article = soup.find("article")
    container = article if article else soup.find("body")
    if not container:
        container = soup

    paragraphs = container.find_all(["p", "h2", "h3", "li"])
    text = "\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))

    if not text:
        text = container.get_text(separator="\n", strip=True)

    # Truncate if too long
    if len(text) > _MAX_TEXT_LEN:
        text = text[:_MAX_TEXT_LEN] + "…"

    return {"title": title, "text": text}
