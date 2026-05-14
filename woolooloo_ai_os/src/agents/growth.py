from .base import BaseAgent
from ..models import AgentType
from ..integrations.notion import notion_client
from ..integrations.slack import slack_client


class GrowthAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.GROWTH)
        self.industries = ["plumber", "electrician", "caterer"]

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
        issue_data = payload.get("data", {})
        identifier = issue_data.get("identifier", "")

        return await self._draft_campaign(
            title=issue_data.get("title", ""),
            description=issue_data.get("description", ""),
            industry=self._detect_industry(issue_data.get("title", "")),
        )

    async def _handle_heartbeat(self) -> dict:
        schedule = self.llm  # Just checking

        drafts = await notion_client.get_campaign_drafts()
        pending_count = len(drafts)

        if pending_count > 0 and schedule == "daily":
            await slack_client.post_message(
                "#growth",
                f"Daily check: {pending_count} campaign drafts in Notion ready for review.",
            )

        return {
            "action": "heartbeat_check",
            "pending_drafts": pending_count,
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")

        industry = self._detect_industry(command)
        draft = await self._draft_campaign(
            title=f"Campaign from {user}",
            description=command,
            industry=industry,
        )

        await slack_client.post_dm(
            user,
            f"Created campaign draft for {industry}: {draft}",
        )

        return draft

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Create growth content: {input_data}")

    async def _draft_campaign(
        self,
        title: str,
        description: str,
        industry: str,
    ) -> dict:
        campaign_content = await self.think(
            f"""Draft a complete marketing campaign for {industry} businesses.

Title: {title}
Details: {description}

Include:
1. Email subject line
2. Email body (3 paragraphs: hook, value prop, CTA)
3. Social media post (Twitter/LinkedIn)
4. SMS follow-up (2 messages)

Format as markdown with clear headers."""
        )

        campaign_type = "Email" if "email" in description.lower() else "Multi-channel"

        result = await notion_client.create_campaign_draft(
            title=f"[Draft] {title}",
            content=campaign_content,
            industry=industry,
            campaign_type=campaign_type,
        )

        await slack_client.post_message(
            "#growth",
            f"New campaign draft created for {industry}: {title}\n"
            f"Notion: {result.get('url', 'Link')}",
        )

        return {
            "action": "campaign_drafted",
            "industry": industry,
            "title": title,
            "notion_id": result.get("id"),
        }

    def _detect_industry(self, text: str) -> str:
        text_lower = text.lower()
        for industry in self.industries:
            if industry in text_lower:
                return industry
        return "general"