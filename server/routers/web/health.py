from fastapi import APIRouter

from core.db import ping_mongo

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    await ping_mongo()
    return {"status": "ok", "mongo": True}
