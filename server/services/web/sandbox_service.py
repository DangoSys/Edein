import httpx

from core.config import SANDBOX_BASE_URL


async def fetch_sandbox_hello(timeout_seconds: float) -> dict:
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.get(f"{SANDBOX_BASE_URL}/hello")
    response.raise_for_status()
    return response.json()
