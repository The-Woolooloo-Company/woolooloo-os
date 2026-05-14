from .base import BaseAgent
from ..models import AgentType
from ..config import get_settings
from ..integrations.xero import xero_client
from ..integrations.linear import linear_client
from ..integrations.slack import slack_client


class OpsAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentType.OPS)
        self.settings = get_settings()

    async def execute(self, input_data: dict) -> dict:
        if "xero_webhook" in input_data:
            return await self._handle_xero_webhook(input_data["xero_webhook"])
        elif "schedule" in input_data:
            return await self._handle_heartbeat()
        elif "command" in input_data:
            return await self._handle_command(input_data)
        else:
            return await self._handle_generic(input_data)

    async def _handle_xero_webhook(self, payload: dict) -> dict:
        event_type = payload.get("eventType", "")
        entity = payload.get("entity", "")

        if entity == "Invoice":
            if event_type == "Payment":
                return await self._on_payment_received(payload)
            elif event_type == "Deleted":
                return await self._on_payment_failed(payload)

        return {"action": "webhook_processed", "event": event_type}

    async def _on_payment_received(self, payload: dict) -> dict:
        invoice = payload.get("data", {})
        amount = invoice.get("Total", 0)
        contact = invoice.get("Contact", {}).get("Name", "Unknown")

        await slack_client.post_message(
            "#ops",
            f"Payment received: ${amount} from {contact}",
        )

        return {
            "action": "payment_received",
            "amount": amount,
            "customer": contact,
        }

    async def _on_payment_failed(self, payload: dict) -> dict:
        invoice = payload.get("data", {})
        contact = invoice.get("Contact", {}).get("Name", "Unknown")

        await slack_client.post_message(
            "#ops",
            f":warning: Payment failed for {contact}. Flagging for follow-up.",
        )

        return {
            "action": "payment_failed",
            "customer": contact,
        }

    async def _handle_heartbeat(self) -> dict:
        try:
            mrr = await xero_client.get_mrr()
            arr = await xero_client.get_arr()
        except Exception:
            mrr = 0
            arr = 0

        try:
            payments = await xero_client.get_recent_payments(days=1)
            new_payments = len(payments)
        except Exception:
            new_payments = 0

        try:
            failed = await xero_client.get_failed_payments(days=7)
            failed_count = len(failed)
        except Exception:
            failed_count = 0

        alert = None
        if failed_count > self.settings.CHURN_FAILED_PAYMENTS:
            alert = f"High failed payment count: {failed_count}"
            await slack_client.post_message("#ops", f":alert: {alert}")

        return {
            "action": "heartbeat_check",
            "mrr": mrr,
            "arr": arr,
            "payments_today": new_payments,
            "failed_this_week": failed_count,
            "alert": alert,
        }

    async def _handle_command(self, input_data: dict) -> dict:
        command = input_data.get("command", "")
        user = input_data.get("user")

        if "mrr" in command.lower() or "revenue" in command.lower():
            mrr = await xero_client.get_mrr()
            arr = await xero_client.get_arr()

            response = f"Revenue Update:\nMRR: ${mrr:,.2f}\nARR: ${arr:,.2f}"
        elif "payments" in command.lower():
            payments = await xero_client.get_recent_payments(days=7)
            response = f"Recent payments ({len(payments)}):\n" + "\n".join(
                f"- {p.get('Contact', {}).get('Name', 'Unknown')}: ${p.get('Total', 0)}"
                for p in payments[:5]
            )
        elif "churn" in command.lower():
            failed = await xero_client.get_failed_payments(days=30)
            response = f"Churn signals: {len(failed)} failed payments in last 30 days"
        else:
            response = await self.think(
                f"Generate ops report for: {command}"
            )

        await slack_client.post_dm(user, response)

        return {"action": "command_processed", "response": response}

    async def _handle_generic(self, input_data: dict) -> dict:
        return await self.think(f"Process ops data: {input_data}")