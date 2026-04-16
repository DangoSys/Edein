from fastapi import APIRouter

from schemas.web.task import TaskCreateRequest, TaskResponse
from services.web.task_service import create_task_and_run, get_task_by_id

router = APIRouter(prefix="/api")


@router.post("/tasks", response_model=TaskResponse)
async def create_task(payload: TaskCreateRequest) -> TaskResponse:
    return await create_task_and_run(payload)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str) -> TaskResponse:
    return await get_task_by_id(task_id)
