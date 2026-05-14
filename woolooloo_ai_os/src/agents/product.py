from .base import BaseAgent
from ..models import AgentType
from ..integrations.linear import linear_client
from ..integrations.notion import notion_client
from ..integrations.slack import slack_client


class ProductAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.PRODUCT)

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
        issue_identifier = issue_data.get("identifier", "")

        if action == "create":
            return await self._on_issue_created(issue_data)
        elif action == "update":
            return await self._on_issue_updated(issue_data)
        elif action == "comment":
            return await self._on_comment_added(issue_data)

        return {"action": "processed", "issue": issue_identifier}

    async def _on_issue_created(self, issue_data: dict) -> dict:
        identifier = issue_data.get("identifier", "")
        title = issue_data.get("title", "")
        description = issue_data.get("description", "")

        comment = f"""New product issue received: **{title}**

I'm analyzing this feature request. Here's my initial assessment:

**Status:** Received and logged

**Next steps:**
1. Review requirements
2. Create technical specification
3. Break down into dev tasks

I'll update this ticket with progress as I work through it."""

        await linear_client.add_comment(issue_data.get("id"), comment)

        if description and len(description) > 100:
            spec = await self._generate_spec(title, description)
            await notion_client.create_page(
                database_id="features-db",
                properties={
                    "Name": {"title": [{"text": {"content": title}}]},
                    "Linear ID": {"rich_text": [{"text": {"content": identifier}}]},
                    "Status": {"select": {"name": "In Progress"}},
                },
                children=[{"type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": spec}}]}}],
            )

        return {
            "action": "issue_received",
            "issue": identifier,
            "spec_created": len(description) > 100,
        }

    async def _on_issue_updated(self, issue_data: dict) -> dict:
        identifier = issue_data.get("identifier", "")
        state = issue_data.get("state", {}).get("name", "")

        if state == "Done":
            await slack_client.post_message(
                "#product",
                f"Feature {identifier} has been marked as done. Archiving in Notion.",
            )

        return {"action": "issue_updated", "issue": identifier, "new_state": state}

    async def _on_comment_added(self, issue_data: dict) -> dict:
        return {"action": "comment_processed"}

    async def _handle_heartbeat(self) -> dict:
        issues = await linear_client.get_issues(labels=["product"])

        pending_count = 0
        for issue in issues.get("issues", {}).get("nodes", []):
            if issue.get("state", {}).get("type") != "completed":
                pending_count += 1

        return {
            "action": "heartbeat_check",
            "pending_issues": pending_count,
            "checked_at": "now",
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")

        response = await self.think(
            f"User {user} sent this command to Product Agent: {command}\n\n"
            "Process this command and return a JSON response with action taken."
        )

        await slack_client.post_dm(user, f"Processed your request: {response}")

        return {"action": "command_processed", "response": response}

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Process this input: {input_data}")

    async def _generate_spec(self, title: str, description: str) -> str:
        spec_prompt = f"""Generate a technical specification for:
Title: {title}
Description: {description}

Format as markdown with sections:
## Overview
## Requirements
## Acceptance Criteria
## Technical Notes
## Related Issues
"""
        return await self.think(spec_prompt)