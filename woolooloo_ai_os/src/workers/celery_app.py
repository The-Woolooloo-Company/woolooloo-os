from celery import Celery
from ..config import get_settings

settings = get_settings()

celery_app = Celery(
    "woolooloo_ai_os",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["src.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

celery_app.conf.beat_schedule = {
    "ops-hourly": {
        "task": "src.workers.tasks.run_agent_heartbeat",
        "schedule": 3600.0,
        "kwargs": {"agent_types": ["ops"]},
    },
    "product-hourly": {
        "task": "src.workers.tasks.run_agent_heartbeat",
        "schedule": 3600.0,
        "kwargs": {"agent_types": ["product", "dev", "sales"]},
    },
    "founder-daily": {
        "task": "src.workers.tasks.run_agent_heartbeat",
        "schedule": 86400.0,
        "kwargs": {"agent_types": ["founder"]},
    },
    "growth-daily": {
        "task": "src.workers.tasks.run_agent_heartbeat",
        "schedule": 86400.0,
        "kwargs": {"agent_types": ["growth"]},
    },
    "founder-weekly": {
        "task": "src.workers.tasks.run_agent_weekly_review",
        "schedule": 604800.0,
    },
}