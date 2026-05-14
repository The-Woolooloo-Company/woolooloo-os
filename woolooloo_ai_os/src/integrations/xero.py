import httpx
from typing import Optional, List
from ..config import get_settings


# Lazy client factory — doesn't require `xero_python` import at module load time
class XeroClient:
    def __init__(self):
        self.settings = get_settings()
        self._available = bool(
            self.settings.XERO_CLIENT_ID
            and self.settings.XERO_CLIENT_SECRET
            and self.settings.XERO_TENANT_ID
        )

    async def _check_available(self) -> bool:
        return self._available

    async def get_mrr(self) -> float:
        if not await self._check_available():
            return 0.0
        # TODO: implement Xero subscription sync
        return 0.0

    async def get_arr(self) -> float:
        mrr = await self.get_mrr()
        return mrr * 12

    async def get_recent_payments(self, days: int = 7) -> List[dict]:
        if not await self._check_available():
            return []
        # TODO: implement via Xero API
        return []

    async def get_failed_payments(self, days: int = 7) -> List[dict]:
        if not await self._check_available():
            return []
        return []


xero_client = XeroClient()
