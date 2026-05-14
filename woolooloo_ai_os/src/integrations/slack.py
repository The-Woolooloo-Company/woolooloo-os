import httpx
from typing import Optional
from ..config import get_settings


class SlackClient:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url="https://slack.com/api",
                headers={
                    "Authorization": f"Bearer {self.settings.SLACK_BOT_TOKEN}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def post_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
        blocks: Optional[list[dict]] = None,
    ):
        payload = {
            "channel": channel,
            "text": text,
        }
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks

        response = await self.client.post("/chat.postMessage", json=payload)
        response.raise_for_status()
        return response.json()

    async def post_dm(self, user_id: str, text: str, blocks: Optional[list[dict]] = None):
        response = await self.client.post(
            "/conversations.open", json={"users": user_id}
        )
        response.raise_for_status()
        data = response.json()

        if data.get("ok"):
            channel_id = data["channel"]["id"]
            return await self.post_message(channel_id, text, blocks=blocks)
        raise Exception(f"Failed to open DM: {data}")

    async def respond_to_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
    ):
        return await self.post_message(channel, text, thread_ts=thread_ts)

    async def update_message(
        self,
        channel: str,
        ts: str,
        text: str,
        blocks: Optional[list[dict]] = None,
    ):
        payload = {
            "channel": channel,
            "ts": ts,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        response = await self.client.post("/chat.update", json=payload)
        response.raise_for_status()
        return response.json()

    async def upload_file(
        self,
        channel: str,
        content: str,
        filename: str,
        title: Optional[str] = None,
    ):
        import io

        response = await self.client.post(
            "/files.upload",
            data={
                "channels": channel,
                "filename": filename,
                "title": title or filename,
                "initial_comment": "Generated report",
            },
            files={"file": (filename, io.BytesIO(content.encode()), "text/plain")},
        )
        response.raise_for_status()
        return response.json()

    async def get_user_info(self, user_id: str):
        response = await self.client.get(
            "/users.info", params={"user": user_id}
        )
        response.raise_for_status()
        return response.json()

    async def get_conversation_members(self, channel_id: str):
        response = await self.client.get(
            "/conversations.members", params={"channel": channel_id}
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        if self._client:
            await self._client.aclose()


slack_client = SlackClient()