import os
import requests


def publish_to_facebook(message: str, image_url: str | None = None) -> str:
    """Post a message (optionally with image) to the configured Facebook Page.
    Returns the FB post id.
    """
    page_id = os.getenv("FB_PAGE_ID", "")
    access_token = os.getenv("FB_ACCESS_TOKEN", "")

    if not page_id or not access_token:
        raise ValueError("FB_PAGE_ID and FB_ACCESS_TOKEN must be set in environment.")

    if image_url:
        # Photo post — uses /photos endpoint
        url = f"https://graph.facebook.com/{page_id}/photos"
        payload = {
            "caption": message,
            "url": image_url,
            "access_token": access_token,
        }
    else:
        # Text-only post
        url = f"https://graph.facebook.com/{page_id}/feed"
        payload = {
            "message": message,
            "access_token": access_token,
        }

    resp = requests.post(url, data=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("id", data.get("post_id", ""))


def comment_on_post(fb_post_id: str, comment_text: str) -> str:
    """Add a comment to a Facebook post. Returns the comment id."""
    access_token = os.getenv("FB_ACCESS_TOKEN", "")
    if not access_token:
        raise ValueError("FB_ACCESS_TOKEN must be set in environment.")

    url = f"https://graph.facebook.com/{fb_post_id}/comments"
    payload = {
        "message": comment_text,
        "access_token": access_token,
    }
    resp = requests.post(url, data=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("id", "")
