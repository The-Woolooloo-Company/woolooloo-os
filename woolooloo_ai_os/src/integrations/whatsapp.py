import httpx
from typing import Optional
from twilio.rest import Client as TwilioClient
from ..config import get_settings


class WhatsAppClient:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[TwilioClient] = None

    @property
    def client(self) -> TwilioClient:
        if self._client is None:
            self._client = TwilioClient(
                self.settings.TWILIO_ACCOUNT_SID,
                self.settings.TWILIO_AUTH_TOKEN,
            )
        return self._client

    def send_message(self, to: str, body: str, media_url: Optional[str] = None):
        message = self.client.messages.create(
            from_=self.settings.TWILIO_WHATSAPP_FROM,
            body=body,
            to=f"whatsapp:{to}",
        )
        return {
            "sid": message.sid,
            "status": message.status,
            "to": message.to,
            "from": message.from_,
        }

    def send_template(
        self,
        to: str,
        template_name: str,
        variables: Optional[dict] = None,
    ):
        from twilio.rest import Client

        content_sid = self._get_template_sid(template_name)
        if not content_sid:
            return self.send_message(
                to, f"Template {template_name} not configured"
            )

        payload = {
            "from": self.settings.TWILIO_WHATSAPP_FROM,
            "content_sid": content_sid,
            "to": f"whatsapp:{to}",
        }

        if variables:
            payload["content_variables"] = str(variables)

        message = self.client.messages.create(**payload)
        return {
            "sid": message.sid,
            "status": message.status,
        }

    def _get_template_sid(self, template_name: str) -> Optional[str]:
        template_mapping = {
            "follow_up": "HX...",
            "proposal": "HX...",
            "welcome": "HX...",
        }
        return template_mapping.get(template_name)

    def get_message_status(self, message_sid: str):
        message = self.client.messages(message_sid).fetch()
        return {
            "sid": message.sid,
            "status": message.status,
            "date_created": str(message.date_created),
            "date_sent": str(message.date_sent) if message.date_sent else None,
        }


class WhatsAppWebhookHandler:
    def __init__(self):
        self.settings = get_settings()

    def validate_signature(self, payload: str, signature: str) -> bool:
        from twilio.request_validator import RequestValidator

        validator = RequestValidator(self.settings.TWILIO_AUTH_TOKEN)
        return validator.validate(
            "https://woolooloo.ai/api/webhooks/whatsapp",
            payload,
            signature,
            self.settings.TWILIO_ACCOUNT_SID,
        )

    def parse_webhook(self, payload: dict) -> dict:
        from_whatsapp = payload.get("From", "")
        to_whatsapp = payload.get("To", "")
        body = payload.get("Body", "")

        return {
            "from": from_whatsapp.replace("whatsapp:", ""),
            "to": to_whatsapp.replace("whatsapp:", ""),
            "body": body.strip(),
            "message_sid": payload.get("MessageSid"),
            "num_media": int(payload.get("NumMedia", 0)),
        }


whatsapp_client = WhatsAppClient()
whatsapp_handler = WhatsAppWebhookHandler()