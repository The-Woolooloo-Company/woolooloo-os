import httpx
from typing import Optional
from notion_client import AsyncClient
from ..config import get_settings


class NotionClient:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[AsyncClient] = None

    @property
    def client(self) -> AsyncClient:
        if self._client is None:
            self._client = AsyncClient(auth=self.settings.NOTION_API_KEY)
        return self._client

    async def query_database(
        self,
        database_id: str,
        filter_props: Optional[dict] = None,
        sorts: Optional[list[dict]] = None,
    ):
        payload = {}
        if filter_props:
            payload["filter"] = filter_props
        if sorts:
            payload["sorts"] = sorts

        return await self.client.databases.query(database_id, **payload)

    async def get_page(self, page_id: str):
        return await self.client.pages.retrieve(page_id)

    async def get_block_children(self, block_id: str):
        return await self.client.blocks.children.list(block_id)

    async def create_page(
        self,
        database_id: str,
        properties: dict,
        children: Optional[list[dict]] = None,
    ):
        payload = {
            "parent": {"database_id": database_id},
            "properties": properties,
        }
        if children:
            payload["children"] = children

        return await self.client.pages.create(**payload)

    async def update_page(self, page_id: str, properties: dict):
        return await self.client.pages.update(page_id, properties=properties)

    async def append_block_children(
        self, block_id: str, children: list[dict]
    ):
        return await self.client.blocks.children.append(block_id, children)

    async def search(self, query: str, filter_type: Optional[str] = None):
        return await self.client.search(
            query, filter={"property": "object", "value": filter_type or "page"}
        )

    async def get_founder_inbox_notes(self):
        if not self.settings.NOTION_FOUNDER_INBOX_ID:
            return []

        notes = await self.query_database(
            self.settings.NOTION_FOUNDER_INBOX_ID,
            sorts=[{"timestamp": "created_time", "direction": "descending"}],
        )
        return notes.get("results", [])

    async def get_campaign_drafts(self):
        if not self.settings.NOTION_CAMPAIGNS_DB_ID:
            return []

        drafts = await self.query_database(
            self.settings.NOTION_CAMPAIGNS_DB_ID,
            filter_props={
                "property": "Status",
                "select": {"equals": "Draft"},
            },
        )
        return drafts.get("results", [])

    async def get_leads(self, status: Optional[str] = None):
        if not self.settings.NOTION_LEADS_DB_ID:
            return []

        filter_props = None
        if status:
            filter_props = {
                "property": "Status",
                "select": {"equals": status},
            }

        leads = await self.query_database(
            self.settings.NOTION_LEADS_DB_ID,
            filter_props=filter_props,
            sorts=[{"timestamp": "created_time", "direction": "descending"}],
        )
        return leads.get("results", [])

    async def create_campaign_draft(
        self,
        title: str,
        content: str,
        industry: str,
        campaign_type: str = "Email",
    ):
        if not self.settings.NOTION_CAMPAIGNS_DB_ID:
            raise Exception("Campaigns database not configured")

        properties = {
            "Name": {"title": [{"text": {"content": title}}]},
            "Industry": {"select": {"name": industry}},
            "Type": {"select": {"name": campaign_type}},
            "Status": {"select": {"name": "Draft"}},
        }

        children = [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Content"}}]
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {"content": content},
                        }
                    ]
                },
            },
        ]

        return await self.create_page(
            self.settings.NOTION_CAMPAIGNS_DB_ID, properties, children
        )

    async def create_proposal(
        self,
        title: str,
        client_name: str,
        content: str,
        deal_value: Optional[float] = None,
    ):
        if not self.settings.NOTION_PROPOSALS_DB_ID:
            raise Exception("Proposals database not configured")

        properties = {
            "Name": {"title": [{"text": {"content": title}}]},
            "Client": {"rich_text": [{"text": {"content": client_name}}]},
            "Status": {"select": {"name": "Draft"}},
        }

        if deal_value:
            properties["Value"] = {"number": deal_value}

        children = [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Proposal Details"}}]
                },
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {"content": content},
                        }
                    ]
                },
            },
        ]

        return await self.create_page(
            self.settings.NOTION_PROPOSALS_DB_ID, properties, children
        )


notion_client = NotionClient()