import httpx
from typing import Optional
from ..config import get_settings


class OpenCodeClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.OPENCODE_API_URL
        self.api_key = self.settings.OPENCODE_API_KEY

    async def generate(
        self,
        task: str,
        context: Optional[dict] = None,
        model: str = "qwen3.5-27b",
    ) -> dict:
        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "task": task,
                    "context": context or {},
                    "model": model,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()

    async def check(self, code: str, language: str = "python") -> dict:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/api/check",
                json={
                    "code": code,
                    "language": language,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()

    async def fix(self, code: str, error: str, language: str = "python") -> dict:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/api/fix",
                json={
                    "code": code,
                    "error": error,
                    "language": language,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()

    async def test(
        self,
        code: str,
        test_type: str = "unit",
        language: str = "python",
    ) -> dict:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(
                f"{self.base_url}/api/test",
                json={
                    "code": code,
                    "test_type": test_type,
                    "language": language,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()


opencode_client = OpenCodeClient()