from abc import ABC, abstractmethod
from typing import Optional, Any
from ..models import AgentType, TriggerType, AGENT_PROMPTS, AgentPrompt
from ..llm.client import llm_client


class BaseAgent(ABC):
    def __init__(self, agent_type: AgentType):
        self.agent_type = agent_type
        self.prompt: AgentPrompt = AGENT_PROMPTS[agent_type]
        self.llm = llm_client

    @abstractmethod
    async def execute(self, input_data: dict) -> dict:
        pass

    async def run(
        self,
        trigger: TriggerType,
        input_data: dict,
    ) -> dict:
        context = self._build_context(trigger, input_data)

        try:
            result = await self.execute(input_data)
            return {
                "status": "success",
                "agent": self.agent_type.value,
                "trigger": trigger.value,
                "result": result,
                "context": context,
            }
        except Exception as e:
            return {
                "status": "error",
                "agent": self.agent_type.value,
                "trigger": trigger.value,
                "error": str(e),
                "context": context,
            }

    def _build_context(self, trigger: TriggerType, input_data: dict) -> dict:
        context = {
            "trigger_type": trigger.value,
            "timestamp": str(input_data.get("timestamp", "")),
        }

        if trigger == TriggerType.EVENT:
            context["source"] = "linear"
            context["issue_id"] = input_data.get("linear_payload", {}).get("data", {}).get("id")
        elif trigger == TriggerType.SCHEDULE:
            context["schedule"] = input_data.get("schedule", "heartbeat")
        elif trigger == TriggerType.DEMAND:
            context["channel"] = input_data.get("channel")
            context["user"] = input_data.get("user")
            context["command"] = input_data.get("command")

        return context

    async def think(
        self,
        user_prompt: str,
        context: Optional[str] = None,
    ) -> str:
        full_prompt = user_prompt
        if context:
            full_prompt = f"{context}\n\n{user_prompt}"

        return await self.llm.complete(
            prompt=full_prompt,
            system=self.prompt.system,
        )

    async def think_with_history(
        self,
        messages: list[dict[str, str]],
    ) -> str:
        system_msg = {"role": "system", "content": self.prompt.system}
        full_messages = [system_msg] + messages

        return await self.llm.chat(messages=full_messages)