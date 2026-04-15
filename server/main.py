import os
from datetime import UTC, datetime

import httpx
from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient

app = FastAPI(title="Edein API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "edein")
MONGO_TASKS_COLLECTION = os.getenv("MONGO_TASKS_COLLECTION", "tasks")
SANDBOX_BASE_URL = os.getenv("SANDBOX_BASE_URL", "http://localhost:8090")

mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
tasks_collection = mongo_client[MONGO_DB][MONGO_TASKS_COLLECTION]


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


class ChatRequest(BaseModel):
    message: str
    payload: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    received: dict
    sandbox: dict


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


def to_task_response(doc: dict) -> TaskResponse:
    return TaskResponse(
        id=str(doc["_id"]),
        status=doc["status"],
        kind=doc.get("kind", "unknown"),
        graph=doc.get("graph", {}),
        node=doc.get("node"),
        result=doc.get("result"),
        created_at=doc["created_at"],
        started_at=doc.get("started_at"),
        finished_at=doc.get("finished_at"),
        sandbox=doc.get("sandbox"),
        error=doc.get("error"),
    )


@app.get("/health")
def health() -> dict:
    mongo_client.admin.command("ping")
    return {"status": "ok", "mongo": True}


@app.on_event("startup")
def startup_check() -> None:
    mongo_client.admin.command("ping")


@app.get("/api/sandbox/hello")
def sandbox_hello() -> dict:
    response = httpx.get(f"{SANDBOX_BASE_URL}/hello", timeout=8.0)
    response.raise_for_status()
    return response.json()


@app.post("/api/tasks", response_model=TaskResponse)
def create_task(payload: TaskCreateRequest) -> TaskResponse:
    now = datetime.now(UTC)
    task_doc = {
        "status": "queued",
        "kind": payload.kind,
        "graph": payload.graph,
        "node": payload.node,
        "result": None,
        "created_at": now,
        "started_at": None,
        "finished_at": None,
        "sandbox": None,
        "error": None,
    }
    insert_result = tasks_collection.insert_one(task_doc)
    task_id = insert_result.inserted_id

    tasks_collection.update_one(
        {"_id": task_id},
        {"$set": {"status": "running", "started_at": datetime.now(UTC)}},
    )

    try:
        result = build_task_result(payload.kind, payload.node, payload.graph)
        response = httpx.get(f"{SANDBOX_BASE_URL}/hello", timeout=12.0)
        response.raise_for_status()
        sandbox_result = response.json()
        tasks_collection.update_one(
            {"_id": task_id},
            {
                "$set": {
                    "status": "success",
                    "finished_at": datetime.now(UTC),
                    "result": result,
                    "sandbox": sandbox_result,
                }
            },
        )
    except HTTPException as exc:
        tasks_collection.update_one(
            {"_id": task_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": datetime.now(UTC),
                    "error": exc.detail,
                }
            },
        )
    except Exception as exc:
        tasks_collection.update_one(
            {"_id": task_id},
            {
                "$set": {
                    "status": "failed",
                    "finished_at": datetime.now(UTC),
                    "error": str(exc),
                }
            },
        )

    doc = tasks_collection.find_one({"_id": task_id})
    return to_task_response(doc)


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: str) -> TaskResponse:
    try:
        oid = ObjectId(task_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="invalid task id") from exc

    doc = tasks_collection.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="task not found")
    return to_task_response(doc)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    response = httpx.get(f"{SANDBOX_BASE_URL}/hello", timeout=8.0)
    response.raise_for_status()
    sandbox = response.json()

    reply = f"received: {payload.message.strip()}"
    return ChatResponse(reply=reply, received=payload.payload, sandbox=sandbox)
