from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/status", tags=["status"])


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    components: dict


@router.get("/health")
async def health_check():
    components = {
        "api": "healthy",
        "database": "unknown",
        "redis": "unknown",
        "vllm": "unknown",
    }

    try:
        from ..llm.client import llm_client
        is_available = await llm_client._is_vllm_available()
        components["vllm"] = "healthy" if is_available else "unavailable"
    except Exception:
        components["vllm"] = "unavailable"

    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        components=components,
    )


@router.get("/ready")
async def readiness_check():
    return {"status": "ready"}


@router.get("/live")
async def liveness_check():
    return {"status": "alive"}