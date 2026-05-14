from .base import BaseAgent
from ..models import AgentType
from ..integrations.notion import notion_client
from ..integrations.slack import slack_client


class SalesAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.SALES)

    async def execute(self, input_data: dict) -> dict:
        if "linear_payload" in input_data:
            return await self._handle_linear_event(input_data["linear_payload"])
        elif "schedule" in input_data:
            return await self._handle_heartbeat()
        elif "command" in input_data:
            return await self._handle_command(input_data)
        elif "whatsapp" in input_data:
            return await self._handle_whatsapp(input_data)
        else:
            return await self._handle_generic(input_data)

    async def _handle_linear_event(self, payload: dict) -> dict:
        issue_data = payload.get("data", {})
        identifier = issue_data.get("identifier", "")

        return {
            "action": "lead_processed",
            "issue": identifier,
            "status": "logged",
        }

    async def _handle_heartbeat(self) -> dict:
        leads = await notion_client.get_leads(status="New")

        for lead in leads:
            qualification_result = await self._qualify_lead(lead)

            if qualification_result.get("qualified"):
                await self._draft_proposal(lead, qualification_result)
            else:
                await self._add_to_nurture(lead, qualification_result)

        return {
            "action": "heartbeat_check",
            "new_leads": len(leads),
            "qualified": sum(1 for l in leads if self._is_qualified({})),
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")

        response = await self.think(
            f"Process sales command from {user}: {command}\n\n"
            "Return next action to take."
        )

        await slack_client.post_dm(user, f"Sales update: {response}")

        return {"action": "command_processed", "response": response}

    async def _handle_whatsapp(self, input_data: dict) -> dict:
        from_whatsapp = input_data.get("from")
        body = input_data.get("body", "")

        lead_data = {
            "name": from_whatsapp,
            "phone": from_whatsapp,
            "message": body,
            "source": "whatsapp",
        }

        qualification = await self._qualify_lead(lead_data)

        if qualification.get("qualified"):
            proposal = await self._draft_proposal(lead_data, qualification)
            response_text = "Thanks for reaching out! I've received your details and will send a proposal shortly."
        else:
            self._add_to_nurture(lead_data, qualification)
            response_text = "Thanks for your message! I'll be in touch soon with more information."

        return {
            "action": "whatsapp_processed",
            "qualified": qualification.get("qualified"),
            "response": response_text,
        }

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Process sales activity: {input_data}")

    async def _qualify_lead(self, lead: dict) -> dict:
        name = lead.get("name", "")
        message = lead.get("message", "")

        qualification_prompt = f"""Qualify this lead using BANT framework:

Lead: {name}
Message: {message}

Evaluate:
- Budget: Does message indicate ability to pay?
- Authority: Is this person decision-maker?
- Need: Is there a clear problem/opportunity?
- Timeline: Any mention of urgency or timeframe?

Return JSON:
{{
  "qualified": true/false,
  "score": 0-100,
  "budget": "High/Medium/Low/Unknown",
  "authority": "Yes/No/Partial",
  "need": "Strong/Moderate/Weak",
  "timeline": "Immediate/Short/Medium/Long",
  "summary": "brief assessment"
}}"""

        result = await self.think(qualification_prompt)

        try:
            import json
            import re
            json_match = re.search(r"\{.*\}", result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

        return {
            "qualified": len(message) > 50,
            "score": min(len(message) * 2, 100),
            "summary": result[:200],
        }

    def _is_qualified(self, lead: dict) -> bool:
        return lead.get("score", 0) >= 60

    async def _draft_proposal(self, lead: dict, qualification: dict) -> dict:
        name = lead.get("name", "Unknown Client")
        deal_value = qualification.get("estimated_value", 5000)

        proposal_content = await self.think(
            f"""Draft a sales proposal for:
Client: {name}
Qualification: {qualification}

Include:
1. Executive summary
2. Proposed solution
3. Pricing (base: ${deal_value})
4. Timeline
5. Next steps

Format as professional proposal text."""
        )

        result = await notion_client.create_proposal(
            title=f"Proposal for {name}",
            client_name=name,
            content=proposal_content,
            deal_value=deal_value,
        )

        await slack_client.post_message(
            "#sales",
            f"New proposal drafted for {name} (${deal_value})",
        )

        return {
            "action": "proposal_drafted",
            "client": name,
            "notion_id": result.get("id"),
            "deal_value": deal_value,
        }

    async def _add_to_nurture(self, lead: dict, qualification: dict) -> dict:
        name = lead.get("name", "Unknown")

        return {
            "action": "added_to_nurture",
            "lead": name,
            "reason": qualification.get("summary", "Partial qualification"),
        }