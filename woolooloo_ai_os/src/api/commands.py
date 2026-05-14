from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..models import AgentType
from ..workers import tasks as celery_tasks
from ..integrations.whatsapp import whatsapp_client

router = APIRouter(prefix="/api/commands", tags=["commands"])


class SlackCommandRequest(BaseModel):
    channel_id: str
    user_id: str
    command: str
    text: str
    response_url: Optional[str] = None


class WhatsAppCommandRequest(BaseModel):
    from_number: str
    body: str


def parse_command(text: str) -> tuple[str, str, Optional[AgentType]]:
    text_lower = text.lower().strip()

    if text_lower.startswith("@product"):
        return (text_lower[8:].strip(), "product", AgentType.PRODUCT)
    elif text_lower.startswith("@dev"):
        return (text_lower[5:].strip(), "dev", AgentType.DEV)
    elif text_lower.startswith("@growth"):
        return (text_lower[8:].strip(), "growth", AgentType.GROWTH)
    elif text_lower.startswith("@sales"):
        return (text_lower[7:].strip(), "sales", AgentType.SALES)
    elif text_lower.startswith("@ops"):
        return (text_lower[5:].strip(), "ops", AgentType.OPS)
    elif text_lower.startswith("@founder"):
        return (text_lower[9:].strip(), "founder", AgentType.FOUNDER)

    if any(word in text_lower for word in ["write", "spec", "feature", "product"]):
        return (text, "product", AgentType.PRODUCT)
    elif any(word in text_lower for word in ["code", "fix", "bug", "dev", "test"]):
        return (text, "dev", AgentType.DEV)
    elif any(word in text_lower for word in ["campaign", "grow", "marketing"]):
        return (text, "growth", AgentType.GROWTH)
    elif any(word in text_lower for word in ["sale", "lead", "proposal"]):
        return (text, "sales", AgentType.SALES)
    elif any(word in text_lower for word in ["revenue", "mrr", "ops", "churn"]):
        return (text, "ops", AgentType.OPS)

    return (text, "product", AgentType.PRODUCT)


@router.post("/slack")
async def receive_slack_command(request: SlackCommandRequest):
    command_text = request.text
    user_id = request.user_id
    channel_id = request.channel_id

    parsed_command, agent_name, agent_type = parse_command(command_text)

    if not parsed_command:
        await slack_client.post_message(
            channel_id,
            "I didn't understand that command. Try @agent_name task description",
        )
        return {"status": "understood", "parsed": "unknown"}

    task = process_demand_command.delay(
        agent_type=agent_type.value,
        command=parsed_command,
        channel=channel_id,
        user=user_id,
    )

    await slack_client.post_message(
        channel_id,
        f"Got it! I'm delegating this to the {agent_name} agent. Task ID: {task.id}",
        thread_ts=request.response_url,
    )

    return {
        "status": "delegated",
        "agent": agent_name,
        "task_id": task.id,
    }


@router.post("/whatsapp")
async def receive_whatsapp_message(request: WhatsAppCommandRequest):
    from_number = request.from_number
    body = request.body

    parsed_command, agent_name, agent_type = parse_command(body)

    task = process_demand_command.delay(
        agent_type=agent_type.value,
        command=parsed_command,
        channel="whatsapp",
        user=from_number,
    )

    return {
        "status": "delegated",
        "agent": agent_name,
        "task_id": task.id,
    }


@router.get("/agents")
async def list_available_agents():
    agents = [
        {
            "name": "product",
            "description": "Build features, write specs, assist developers",
            "triggers": ["Linear product label", "Hourly heartbeat", "@product"],
        },
        {
            "name": "dev",
            "description": "Code generation, tests, bug fixes via OpenCode",
            "triggers": ["Linear dev label", "@dev mention", "Hourly heartbeat"],
        },
        {
            "name": "growth",
            "description": "Draft marketing campaigns for plumbers, electricians, caterers",
            "triggers": ["Linear growth label", "Daily 9 AM", "@growth"],
        },
        {
            "name": "sales",
            "description": "Lead qualification and proposal drafting",
            "triggers": ["New lead in Notion", "WhatsApp message", "Hourly heartbeat"],
        },
        {
            "name": "ops",
            "description": "Track revenue, usage, churn via Xero",
            "triggers": ["Xero webhook", "Hourly heartbeat", "@ops"],
        },
        {
            "name": "founder",
            "description": "Convert Notion notes to Linear projects and tasks",
            "triggers": ["New Notion note", "Daily 7 AM", "Weekly Sunday", "@founder"],
        },
    ]
    return {"agents": agents}