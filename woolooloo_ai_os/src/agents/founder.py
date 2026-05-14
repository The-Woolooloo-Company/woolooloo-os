from .base import BaseAgent
from ..models import AgentType
from ..config import get_settings
from ..integrations.notion import notion_client
from ..integrations.linear import linear_client
from ..integrations.slack import slack_client


class FounderAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.FOUNDER)
        self.settings = get_settings()

    async def execute(self, input_data: dict) -> dict:
        if "schedule" in input_data:
            schedule = input_data["schedule"]
            if schedule == "weekly_review":
                return await self._weekly_review()
            else:
                return await self._handle_heartbeat()
        elif "command" in input_data:
            return await self._handle_command(input_data)
        elif "notion_note" in input_data:
            return await self._handle_notion_note(input_data["notion_note"])
        else:
            return await self._handle_generic(input_data)

    async def _handle_heartbeat(self) -> dict:
        notes = await notion_client.get_founder_inbox_notes()

        processed = 0
        projects_created = 0

        for note in notes[:5]:
            note_id = note.get("id")
            title = self._extract_title(note)

            action_items = await self._extract_action_items(note)

            if action_items:
                if len(action_items) > 2:
                    linear_result = await linear_client.create_issue(
                        title=f"[From Notes] {title}",
                        description=f"Extracted from Notion: {note_id}\n\nAction items:\n" + "\n".join(
                            f"- {item}" for item in action_items
                        ),
                        priority=2,
                    )
                    projects_created += 1
                else:
                    for item in action_items:
                        await linear_client.create_issue(
                            title=item,
                            description=f"Extracted from Notion: {note_id}",
                            priority=3,
                        )
                projects_created += 1

            processed += 1

        summary = f"Good morning! I processed {processed} notes and created {projects_created} Linear items."

        await slack_client.post_dm(
            self.settings.FOUNDER_USER_ID if hasattr(self.settings, 'FOUNDER_USER_ID') else "founder",
            summary,
        )

        return {
            "action": "daily_digest",
            "notes_processed": processed,
            "projects_created": projects_created,
        }

    async def _weekly_review(self) -> dict:
        weekly_summary = await self.think(
            """Create a weekly review summary for Woolooloo Technologies.

Cover:
1. Key accomplishments this week
2. Blockers and challenges
3. Priorities for next week
4. Energy/team morale check
5. Budget/status update

Format as a concise markdown report."""
        )

        try:
            await linear_client.create_issue(
                title="Weekly Review",
                description=weekly_summary,
                team_id=self.settings.LINEAR_TEAM_ID,
            )
        except Exception:
            pass

        await slack_client.post_message(
            "#general",
            f":spiral_calendar: *Weekly Review*\n\n{weekly_summary}",
        )

        return {
            "action": "weekly_review",
            "summary": weekly_summary,
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")

        response = await self.think(
            f"Founder {user} request: {command}\n\n"
            "Process this and return actionable next steps."
        )

        await slack_client.post_dm(user, f"Here's my analysis:\n\n{response}")

        return {"action": "command_processed", "response": response}

    async def _handle_notion_note(self, note: dict) -> dict:
        note_id = note.get("id")
        title = self._extract_title(note)
        content = self._extract_content(note)

        action_items = await self._extract_action_items(note)

        results = {
            "note_id": note_id,
            "title": title,
            "action_items": action_items,
        }

        if action_items:
            if len(action_items) > 2:
                linear_result = await linear_client.create_issue(
                    title=f"[From Notes] {title}",
                    description=f"From Notion: {note_id}\n\n" + "\n".join(
                        f"- {item}" for item in action_items
                    ),
                )
                results["linear_project"] = linear_result
            else:
                for item in action_items:
                    await linear_client.create_issue(
                        title=item,
                        description=f"From Notion: {note_id}",
                    )
                results["linear_tasks"] = len(action_items)

        return results

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Process founder request: {input_data}")

    async def _extract_action_items(self, note: dict) -> list[str]:
        content = self._extract_content(note)

        extraction_prompt = f"""Extract action items from this note:

{content}

Return a JSON array of action items (strings). If none found, return [].
Only include items that are:
- Clear tasks with verbs (do, create, fix, call, schedule, etc.)
- Not already completed
- Actionable within 1-2 weeks"""

        result = await self.think(extraction_prompt)

        try:
            import json
            import re
            json_match = re.search(r"\[.*\]", result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

        lines = result.strip().split("\n")
        return [line.strip("- ").strip() for line in lines if line.strip().startswith("-")]

    def _extract_title(self, note: dict) -> str:
        props = note.get("properties", {})
        title_prop = props.get("title") or props.get("Name")
        if title_prop:
            return title_prop[0].get("plain_text", "Untitled")
        return "Untitled Note"

    def _extract_content(self, note: dict) -> str:
        blocks = note.get("blocks", [])
        content_parts = []

        for block in blocks:
            block_type = block.get("type")
            block_content = block.get(block_type, {}).get("rich_text", [])
            for text in block_content:
                content_parts.append(text.get("plain_text", ""))

        return "\n".join(content_parts)