import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .api import webhooks, commands, agents, status

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(check_llm_health())
    yield


async def check_llm_health():
    from .llm.client import llm_client

    while True:
        try:
            is_available = await llm_client._is_vllm_available()
            if is_available:
                print("✓ vLLM is available")
            else:
                print("⚠ vLLM not available, using OpenRouter fallback")
        except Exception as e:
            print(f"✗ LLM health check failed: {e}")
        await asyncio.sleep(60)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Woolooloo AI Operating System - Multi-agent orchestration platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router)
app.include_router(commands.router)
app.include_router(agents.router)
app.include_router(status.router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "agents": ["product", "dev", "growth", "sales", "ops", "founder"],
    }


@app.get("/api")
async def api_root():
    return {
        "endpoints": {
            "webhooks": "/api/webhooks/{linear,notion,xero}",
            "commands": "/api/commands/{slack,whatsapp}",
            "agents": "/api/agents",
            "status": "/api/status",
        }
    }