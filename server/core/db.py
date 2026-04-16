import asyncio

from beanie import init_beanie
from pymongo import AsyncMongoClient

from core.config import MONGO_DB, MONGO_URIS
from models.task import Task

mongo_client: AsyncMongoClient | None = None


async def init_db() -> None:
    global mongo_client
    if mongo_client is None:
        mongo_client = await create_client()
    database = mongo_client[MONGO_DB]
    await init_beanie(database=database, document_models=[Task])


async def ping_mongo() -> None:
    if mongo_client is None:
        raise RuntimeError("mongo client is not initialized")
    await mongo_client.admin.command("ping")


async def create_client() -> AsyncMongoClient:
    last_error: Exception | None = None
    for uri in MONGO_URIS:
        client = AsyncMongoClient(uri, serverSelectionTimeoutMS=800)
        try:
            await asyncio.wait_for(client.admin.command("ping"), timeout=1.0)
            return client
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"could not connect to any mongo uri: {MONGO_URIS}") from last_error
