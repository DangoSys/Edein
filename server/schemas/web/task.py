from datetime import datetime

from pydantic import BaseModel, Field


class TaskCreateRequest(BaseModel):
    kind: str
    graph: dict = Field(default_factory=dict)
    node: dict | None = None


class TaskResponse(BaseModel):
    id: str
    status: str
    kind: str
    graph: dict
    node: dict | None = None
    result: dict | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    sandbox: dict | None = None
    error: str | None = None

