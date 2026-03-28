import os
import requests


def publish_to_facebook(message: str) -> str:
    """Post a message to the configured Facebook Page. Returns the FB post id."""
    page_id = os.getenv("FB_PAGE_ID", "")
    access_token = os.getenv("FB_ACCESS_TOKEN", "")

    if not page_id or not access_token:
        raise ValueError("FB_PAGE_ID and FB_ACCESS_TOKEN must be set in environment.")

    url = f"https://graph.facebook.com/{page_id}/feed"
    payload = {
        "message": message,
        "access_token": access_token,
    }
    resp = requests.post(url, data=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("id", "")
