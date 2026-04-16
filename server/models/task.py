from datetime import datetime

from beanie import Document
from pydantic import Field

from core.config import MONGO_TASKS_COLLECTION


class Task(Document):
    status: str
    kind: str
    graph: dict = Field(default_factory=dict)
    node: dict | None = None
    result: dict | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    sandbox: dict | None = None
    error: str | None = None

    class Settings:
        name = MONGO_TASKS_COLLECTION

