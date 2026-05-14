import httpx
from .base import BaseAgent
from ..models import AgentType
from ..config import get_settings
from ..integrations.linear import linear_client
from ..integrations.slack import slack_client


class DevAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.DEV)
        self.settings = get_settings()
        self.opencode_url = self.settings.OPENCODE_API_URL
        self.opencode_key = self.settings.OPENCODE_API_KEY

    async def execute(self, input_data: dict) -> dict:
        if "linear_payload" in input_data:
            return await self._handle_linear_event(input_data["linear_payload"])
        elif "schedule" in input_data:
            return await self._handle_heartbeat()
        elif "command" in input_data:
            return await self._handle_command(input_data)
        else:
            return await self._handle_generic(input_data)

    async def _handle_linear_event(self, payload: dict) -> dict:
        action = payload.get("action", "")
        issue_data = payload.get("data", {})
        issue_id = issue_data.get("id")
        identifier = issue_data.get("identifier", "")

        if action == "create":
            return await self._on_issue_created(issue_data)
        elif action == "comment":
            return await self._on_comment(issue_data)

        return {"action": "processed", "issue": identifier}

    async def _on_issue_created(self, issue_data: dict) -> dict:
        identifier = issue_data.get("identifier", "")
        title = issue_data.get("title", "")
        description = issue_data.get("description", "")

        await linear_client.add_comment(
            issue_data.get("id"),
            f"I'm analyzing this dev task: **{title}**\n\n"
            "Let me generate the boilerplate code and tests.",
        )

        if description:
            result = await self._generate_code(identifier, title, description)
            return {
                "action": "code_generated",
                "issue": identifier,
                "result": result,
            }

        return {"action": "acknowledged", "issue": identifier}

    async def _on_comment(self, issue_data: dict) -> dict:
        identifier = issue_data.get("identifier", "")
        comments = issue_data.get("comments", {}).get("nodes", [])

        if not comments:
            return {"action": "no_comments"}

        latest_comment = comments[-1] if comments else {}
        body = latest_comment.get("body", "")

        if "@dev" in body or "fix" in body.lower():
            result = await self._generate_code(
                identifier,
                issue_data.get("title", ""),
                body,
            )
            return {
                "action": "fix_requested",
                "issue": identifier,
                "result": result,
            }

        return {"action": "comment_processed"}

    async def _handle_heartbeat(self) -> dict:
        issues = await linear_client.get_issues(labels=["dev", "dev-task"])

        pending = []
        for issue in issues.get("issues", {}).get("nodes", []):
            if issue.get("state", {}).get("type") != "completed":
                pending.append({
                    "id": issue.get("id"),
                    "identifier": issue.get("identifier"),
                    "title": issue.get("title"),
                })

        return {
            "action": "heartbeat_check",
            "pending_tasks": len(pending),
            "tasks": pending[:5],
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")
        channel = input_data.get("channel")

        result = await self._generate_code(
            f"CMD-{hash(command) % 10000}",
            "Manual request",
            command,
        )

        await slack_client.post_message(
            channel,
            f"@{user} Here's the result:\n\n{result}",
        )

        return {"action": "command_processed", "result": result}

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Process this dev task: {input_data}")

    async def _generate_code(self, task_id: str, title: str, description: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{self.opencode_url}/api/generate",
                    json={
                        "task": description,
                        "context": {
                            "task_id": task_id,
                            "title": title,
                        },
                        "model": "qwen3.5-27b",
                    },
                    headers={
                        "Authorization": f"Bearer {self.opencode_key}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                result = response.json()
                return result.get("code", result.get("response", "Code generated"))
        except httpx.HTTPError as e:
            fallback_result = await self.think(
                f"Generate code for: {title}\n\n{description}\n\n"
                "Provide the implementation code."
            )
            return fallback_result