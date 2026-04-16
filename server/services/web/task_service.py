from datetime import UTC, datetime

from beanie import PydanticObjectId
from fastapi import HTTPException

from models.task import Task
from repositories.task_repository import (
    create_task,
    get_task_by_oid,
    set_task_failed,
    set_task_running,
    set_task_success,
)
from schemas.web.task import TaskCreateRequest, TaskResponse
from services.web.sandbox_service import fetch_sandbox_hello


def cfg_sum(cfg: dict) -> int:
    total = 0
    for value in cfg.values():
        if isinstance(value, int | float):
            total += int(value)
        else:
            total += len(str(value))
    return total


def build_task_result(kind: str, node: dict | None, graph: dict) -> dict:
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    if kind == "generate":
        if node is None:
            raise HTTPException(status_code=400, detail="generate requires node")
        node_type = str(node.get("type", "node")).lower()
        node_id = str(node.get("id", "unknown"))
        return {"artifact": f"{node_type}_{node_id}.v"}

    if kind == "verify":
        if len(edges) == 0 and len(nodes) > 1:
            raise HTTPException(status_code=400, detail="graph has isolated balls")
        return {"pass": True}

    if kind == "evaluate":
        if node is None:
            raise HTTPException(status_code=400, detail="evaluate requires node")
        node_type = str(node.get("type", "BALL"))
        cfg = node.get("cfg", {})
        if not isinstance(cfg, dict):
            cfg = {}
        base = cfg_sum(cfg)
        return {
            "latency": base * 4 + len(node_type) * 13,
            "area": base * 7 + len(node_type) * 19,
        }

    raise HTTPException(status_code=400, detail=f"unsupported kind: {kind}")


def to_task_response(doc: Task) -> TaskResponse:
    return TaskResponse(
        id=str(doc.id),
        status=doc.status,
        kind=doc.kind,
        graph=doc.graph,
        node=doc.node,
        result=doc.result,
        created_at=doc.created_at,
        started_at=doc.started_at,
        finished_at=doc.finished_at,
        sandbox=doc.sandbox,
        error=doc.error,
    )


async def create_task_and_run(payload: TaskCreateRequest) -> TaskResponse:
    now = datetime.now(UTC)
    task = Task(
        status="queued",
        kind=payload.kind,
        graph=payload.graph,
        node=payload.node,
        result=None,
        created_at=now,
        started_at=None,
        finished_at=None,
        sandbox=None,
        error=None,
    )
    created = await create_task(task)
    if created.id is None:
        raise HTTPException(status_code=500, detail="task id missing after create")

    task_id = created.id
    await set_task_running(task_id, datetime.now(UTC))

    try:
        result = build_task_result(payload.kind, payload.node, payload.graph)
        sandbox_result = await fetch_sandbox_hello(timeout_seconds=12.0)
        await set_task_success(task_id, datetime.now(UTC), result, sandbox_result)
    except HTTPException as exc:
        await set_task_failed(task_id, datetime.now(UTC), str(exc.detail))
    except Exception as exc:
        await set_task_failed(task_id, datetime.now(UTC), str(exc))

    doc = await get_task_by_oid(task_id)
    if doc is None:
        raise HTTPException(status_code=500, detail="task missing after create")
    return to_task_response(doc)


async def get_task_by_id(task_id: str) -> TaskResponse:
    try:
        oid = PydanticObjectId(task_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="invalid task id") from exc

    doc = await get_task_by_oid(oid)
    if doc is None:
        raise HTTPException(status_code=404, detail="task not found")
    return to_task_response(doc)
