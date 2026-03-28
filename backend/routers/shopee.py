import os
from fastapi import APIRouter

router = APIRouter(prefix="/shopee", tags=["shopee"])


@router.get("/config")
def get_shopee_config():
    """Return Shopee affiliate configuration (non-sensitive)."""
    return {
        "affiliate_id": os.getenv("SHOPEE_AFFILIATE_ID", ""),
    }
