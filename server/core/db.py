from beanie import init_beanie
from pymongo import AsyncMongoClient

from core.config import MONGO_DB, MONGO_URI
from models.task import Task

mongo_client = AsyncMongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
database = mongo_client[MONGO_DB]


async def init_db() -> None:
    await init_beanie(database=database, document_models=[Task])
    await ping_mongo()


async def ping_mongo() -> None:
    await mongo_client.admin.command("ping")
