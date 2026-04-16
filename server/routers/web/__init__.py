from fastapi import APIRouter

from routers.web.chat import router as chat_router
from routers.web.health import router as health_router
from routers.web.sandbox import router as sandbox_router
from routers.web.tasks import router as tasks_router

router = APIRouter()
router.include_router(health_router)
router.include_router(sandbox_router)
router.include_router(tasks_router)
router.include_router(chat_router)

