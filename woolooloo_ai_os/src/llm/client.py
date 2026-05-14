import httpx
from typing import Optional
from ..config import get_settings


class LLMClient:
    def __init__(
        self,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        self.settings = get_settings()
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.model = model or self.settings.VLLM_MODEL
        self._vllm_client: Optional[httpx.AsyncClient] = None
        self._openrouter_client: Optional[httpx.AsyncClient] = None

    @property
    def vllm_client(self) -> httpx.AsyncClient:
        if self._vllm_client is None:
            self._vllm_client = httpx.AsyncClient(
                base_url=self.settings.VLLM_HOST,
                timeout=self.settings.VLLM_TIMEOUT,
                headers={
                    "Authorization": f"Bearer {self.settings.VLLM_API_KEY}"
                    if self.settings.VLLM_API_KEY
                    else ""
                },
            )
        return self._vllm_client

    @property
    def openrouter_client(self) -> httpx.AsyncClient:
        if self._openrouter_client is None:
            self._openrouter_client = httpx.AsyncClient(
                base_url=self.settings.OPENROUTER_BASE_URL,
                timeout=self.settings.VLLM_TIMEOUT,
                headers={
                    "Authorization": f"Bearer {self.settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://woolooloo.ai",
                    "X-Title": "Woolooloo AI OS",
                },
            )
        return self._openrouter_client

    async def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        use_fallback: bool = False,
    ) -> str:
        try:
            if use_fallback or not self._is_vllm_available():
                return await self._openrouter_complete(prompt, system)
            return await self._vllm_complete(prompt, system)
        except Exception as e:
            if not use_fallback and self.settings.OPENROUTER_API_KEY:
                return await self._openrouter_complete(prompt, system)
            raise e

    async def _is_vllm_available(self) -> bool:
        try:
            response = await self.vllm_client.get("/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    async def _vllm_complete(
        self, prompt: str, system: Optional[str] = None
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.vllm_client.post(
            "/v1/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _openrouter_complete(
        self, prompt: str, system: Optional[str] = None
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await self.openrouter_client.post(
            "/chat/completions",
            json={
                "model": self.settings.OPENROUTER_MODEL,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def chat(
        self,
        messages: list[dict[str, str]],
        use_fallback: bool = False,
    ) -> str:
        try:
            if use_fallback or not self._is_vllm_available():
                return await self._openrouter_chat(messages)
            return await self._vllm_chat(messages)
        except Exception as e:
            if not use_fallback and self.settings.OPENROUTER_API_KEY:
                return await self._openrouter_chat(messages)
            raise e

    async def _vllm_chat(self, messages: list[dict[str, str]]) -> str:
        response = await self.vllm_client.post(
            "/v1/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _openrouter_chat(
        self, messages: list[dict[str, str]]
    ) -> str:
        response = await self.openrouter_client.post(
            "/chat/completions",
            json={
                "model": self.settings.OPENROUTER_MODEL,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def close(self):
        if self._vllm_client:
            await self._vllm_client.aclose()
        if self._openrouter_client:
            await self._openrouter_client.aclose()


llm_client = LLMClient()