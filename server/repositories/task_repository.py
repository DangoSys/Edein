from datetime import datetime

from beanie import PydanticObjectId

from models.task import Task


async def create_task(task: Task) -> Task:
    await task.insert()
    return task


async def set_task_running(task_id: PydanticObjectId, started_at: datetime) -> None:
    task = await Task.get(task_id)
    if task is None:
        return
    task.status = "running"
    task.started_at = started_at
    await task.save()


async def set_task_success(
    task_id: PydanticObjectId,
    finished_at: datetime,
    result: dict,
    sandbox_result: dict,
) -> None:
    task = await Task.get(task_id)
    if task is None:
        return
    task.status = "success"
    task.finished_at = finished_at
    task.result = result
    task.sandbox = sandbox_result
    await task.save()


async def set_task_failed(
    task_id: PydanticObjectId,
    finished_at: datetime,
    error: str,
) -> None:
    task = await Task.get(task_id)
    if task is None:
        return
    task.status = "failed"
    task.finished_at = finished_at
    task.error = error
    await task.save()


async def get_task_by_oid(task_id: PydanticObjectId) -> Task | None:
    return await Task.get(task_id)
