from fastapi import APIRouter

from schemas.web.chat import ChatRequest, ChatResponse
from services.web.chat_service import chat

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
async def chat_route(payload: ChatRequest) -> ChatResponse:
    return await chat(payload)

