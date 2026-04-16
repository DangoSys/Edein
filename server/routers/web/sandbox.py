from fastapi import APIRouter

from services.web.sandbox_service import fetch_sandbox_hello

router = APIRouter(prefix="/api")


@router.get("/sandbox/hello")
async def sandbox_hello() -> dict:
    return await fetch_sandbox_hello(timeout_seconds=8.0)
