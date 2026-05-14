from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from ..config import get_settings
from ..workers.tasks import process_linear_webhook
import hmac
import hashlib
import json

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
settings = get_settings()


class LinearWebhookPayload(BaseModel):
    action: str
    data: dict
    webhook_id: Optional[str] = None
    created_at: Optional[str] = None


def verify_linear_signature(payload: bytes, signature: str) -> bool:
    if not settings.LINEAR_WEBHOOK_SECRET:
        return True

    secret = settings.LINEAR_WEBHOOK_SECRET.encode()
    expected_signature = hmac.new(
        secret, payload, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected_signature}", signature)


@router.post("/linear")
async def receive_linear_webhook(
    request: Request,
    x_linear_signature: Optional[str] = Header(None),
    x_linear_webhook_id: Optional[str] = Header(None),
):
    payload = await request.body()

    if x_linear_signature:
        if not verify_linear_signature(payload, x_linear_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    webhook_payload = {
        "action": data.get("action", ""),
        "data": data.get("data", {}),
        "webhook_id": x_linear_webhook_id,
        "created_at": data.get("created_at"),
    }

    task = process_linear_webhook.delay(webhook_payload)

    return {
        "status": "accepted",
        "task_id": task.id,
        "action": webhook_payload["action"],
    }


@router.post("/notion")
async def receive_notion_webhook(request: Request):
    payload = await request.json()

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    if event_type == "page.created" or event_type == "page.updated":
        from ...agents import get_agent
        from ...models import AgentType, TriggerType

        founder = get_agent(AgentType.FOUNDER)
        result = await founder.run(
            trigger=TriggerType.EVENT,
            input_data={"notion_note": data},
        )

        return {"status": "processed", "result": result}

    return {"status": "ignored", "event": event_type}


@router.post("/xero")
async def receive_xero_webhook(request: Request):
    payload = await request.json()

    from ...agents import get_agent
    from ...models import AgentType, TriggerType

    ops = get_agent(AgentType.OPS)
    result = await ops.run(
        trigger=TriggerType.EVENT,
        input_data={"xero_webhook": payload},
    )

    return {"status": "processed", "result": result}


@router.get("/health")
async def webhook_health():
    return {"status": "healthy", "webhooks": ["linear", "notion", "xero"]}