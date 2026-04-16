from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.db import init_db
from routers.web import router as web_router

app = FastAPI(title="Edein API", version="0.1.0")
app.include_router(web_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_check() -> None:
    await init_db()
