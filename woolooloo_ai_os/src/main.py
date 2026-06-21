import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import agents, commands, status, webhooks
from .config import get_settings
from .llm.client import llm_client

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    asyncio.create_task(check_llm_health())
    print("✓ vLLM health check started")
    yield
    # Shutdown
    await llm_client.close()
    print("✓ LLM clients closed")


async def check_llm_health():
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

# CORS - Restrict to known origins in production
_allowed_origins = [
    "http://localhost:3000",    # Next.js dev
    "http://localhost:5173",    # Vite dev (if used)
    "http://192.168.1.161:3000",  # Local deployment
    "https://os.woolooloo.tech",  # Production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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
