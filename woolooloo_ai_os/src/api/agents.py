from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..models import AgentType, TriggerType
from ..agents import get_agent

router = APIRouter(prefix="/api/agents", tags=["agents"])


class RunAgentRequest(BaseModel):
    agent_type: str
    trigger: str = "demand"
    input_data: dict = {}


class AgentStatusResponse(BaseModel):
    name: str
    status: str
    description: str
    capabilities: list[str]


@router.get("/")
async def list_agents():
    from ..models import AGENT_PROMPTS

    agents = []
    for agent_type, prompt in AGENT_PROMPTS.items():
        agents.append({
            "name": agent_type.value,
            "description": prompt.description,
            "capabilities": prompt.capabilities,
            "triggers": prompt.trigger_conditions,
            "outputs": prompt.output_format,
        })
    return {"agents": agents}


@router.get("/{agent_name}")
async def get_agent_status(agent_name: str):
    from ..models import AGENT_PROMPTS, AgentType

    try:
        agent_type = AgentType(agent_name.lower())
    except ValueError:
        raise HTTPException(status_code=404, detail="Agent not found")

    prompt = AGENT_PROMPTS.get(agent_type)
    if not prompt:
        raise HTTPException(status_code=404, detail="Agent prompt not found")

    return {
        "name": agent_type.value,
        "description": prompt.description,
        "capabilities": prompt.capabilities,
        "triggers": prompt.trigger_conditions,
        "outputs": prompt.output_format,
        "system_prompt": prompt.system,
    }


class CommandRequest(BaseModel):
    command: str
    agent_type: str = ""
    trigger: str = "demand"
    input_data: dict = {}

@router.post("/{agent_name}/run")
async def run_specific_agent(agent_name: str, request: CommandRequest):
    try:
        agent_type = AgentType(agent_name.lower())
    except ValueError:
        raise HTTPException(status_code=404, detail="Agent not found")

    command = request.command

    # Try Celery first, fall back to direct execution when Redis isn't available
    try:
        from ..workers.tasks import run_agent as celery_run_agent
        input_data = {
            "command": command,
            "manual_trigger": True,
            **request.input_data,
        }
        task = celery_run_agent.delay(
            agent_type=agent_type.value,
            trigger=request.trigger,
            input_data=input_data,
        )
        return {
            "status": "queued",
            "task_id": task.id,
            "agent": agent_name,
        }
    except Exception:
        pass

    # Direct synchronous execution fallback
    try:
        agent = get_agent(agent_type)
        result = await agent.think(command)
        return {
            "status": "completed",
            "agent": agent_name,
            "response": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {e}")


@router.get("/{agent_name}/test")
async def test_agent(agent_name: str):
    try:
        agent_type = AgentType(agent_name.lower())
    except ValueError:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = get_agent(agent_type)

    test_result = await agent.think(
        "Introduce yourself briefly and list your top 3 capabilities.",
    )

    return {
        "agent": agent_name,
        "test_response": test_result,
    }