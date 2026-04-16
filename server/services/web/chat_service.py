from fastapi import HTTPException

from schemas.web.chat import ChatRequest, ChatResponse
from services.web.sandbox_service import fetch_sandbox_hello


async def chat(payload: ChatRequest) -> ChatResponse:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message must not be empty")

    sandbox = await fetch_sandbox_hello(timeout_seconds=8.0)
    reply = f"received: {message}"
    return ChatResponse(reply=reply, received=payload.payload, sandbox=sandbox)
