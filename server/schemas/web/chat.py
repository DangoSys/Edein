from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    payload: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    received: dict
    sandbox: dict

