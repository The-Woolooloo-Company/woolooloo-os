import time
from datetime import datetime
from celery import chain, group
from .celery_app import celery_app
from ..models import AgentType, TriggerType
from ..llm.client import llm_client


@celery_app.task(bind=True)
def run_agent(
    self,
    agent_type: str,
    trigger: str,
    input_data: dict,
):
    from ..agents import get_agent

    start_time = time.time()
    agent = get_agent(AgentType(agent_type))

    try:
        result = agent.run(
            trigger=TriggerType(trigger),
            input_data=input_data,
        )
        duration = int((time.time() - start_time) * 1000)

        return {
            "status": "success",
            "agent_type": agent_type,
            "output": result,
            "duration_ms": duration,
        }
    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        return {
            "status": "failed",
            "agent_type": agent_type,
            "error": str(e),
            "duration_ms": duration,
        }


@celery_app.task(bind=True)
def run_agent_heartbeat(self, agent_types: list[str]):
    results = []
    for agent_type in agent_types:
        result = run_agent.delay(
            agent_type=agent_type,
            trigger="schedule",
            input_data={"schedule": "heartbeat"},
        )
        results.append(result)
    return {"task_ids": [r.id for r in results], "agents": agent_types}


@celery_app.task(bind=True)
def run_agent_weekly_review(self):
    from ..agents import get_agent

    founder = get_agent(AgentType.FOUNDER)
    result = founder.run(
        trigger=TriggerType.SCHEDULE,
        input_data={"schedule": "weekly_review"},
    )
    return {"status": "success", "output": result}


@celery_app.task(bind=True)
def process_linear_webhook(self, payload: dict):
    from ..agents import get_agent_for_linear_action

    action = payload.get("action", "")
    agent_type = get_agent_for_linear_action(action, payload)

    if agent_type:
        return run_agent.delay(
            agent_type=agent_type.value,
            trigger="event",
            input_data={"linear_payload": payload},
        )
    return {"status": "skipped", "reason": "no_agent_for_action"}


@celery_app.task(bind=True)
def process_demand_command(
    self,
    agent_type: str,
    command: str,
    channel: str,
    user: str,
):
    agent = get_agent(AgentType(agent_type))

    result = agent.run(
        trigger=TriggerType.DEMAND,
        input_data={
            "command": command,
            "channel": channel,
            "user": user,
        },
    )

    return {
        "status": "success",
        "agent_type": agent_type,
        "output": result,
    }


@celery_app.task(bind=True)
def test_llm_connection(self):
    result = llm_client.complete(
        prompt="Say 'Hello from Woolooloo AI OS' in exactly those words.",
        system="You are a helpful assistant.",
    )
    return {"status": "success", "result": result}