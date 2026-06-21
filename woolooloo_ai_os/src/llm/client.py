import httpx

from ..config import get_settings


class LLMClient:
    """Unified LLM client with vLLM primary + OpenRouter fallback."""

    def __init__(
        self,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        self.settings = get_settings()
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.model = model or self.settings.VLLM_MODEL
        self._vllm_client: httpx.AsyncClient | None = None
        self._openrouter_client: httpx.AsyncClient | None = None

    @property
    def vllm_client(self) -> httpx.AsyncClient:
        if self._vllm_client is None:
            self._vllm_client = httpx.AsyncClient(
                base_url=self.settings.VLLM_HOST,
                timeout=self.settings.VLLM_TIMEOUT,
                headers={
                    "Authorization": f"Bearer {self.settings.VLLM_API_KEY}"
                    if self.settings.VLLM_API_KEY
                    else "",
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
                    "HTTP-Referer": self.settings.APP_NAME,
                    "X-Title": self.settings.APP_NAME,
                },
            )
        return self._openrouter_client

    async def _is_vllm_available(self) -> bool:
        try:
            response = await self.vllm_client.get("/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def _build_completion_payload(self, messages: list[dict[str, str]]) -> dict:
        """Build a standardized chat completion payload."""
        return {
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

    async def _call_provider(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        model: str,
        messages: list[dict[str, str]],
    ) -> str:
        """Call any completion provider with standardized payload."""
        payload = self._build_completion_payload(messages)
        payload["model"] = model

        response = await client.post(endpoint, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _vllm_call(self, messages: list[dict[str, str]]) -> str:
        return await self._call_provider(
            self.vllm_client,
            "/v1/chat/completions",
            self.model,
            messages,
        )

    async def _openrouter_call(self, messages: list[dict[str, str]]) -> str:
        return await self._call_provider(
            self.openrouter_client,
            "/chat/completions",
            self.settings.OPENROUTER_MODEL,
            messages,
        )

    async def complete(
        self,
        prompt: str,
        system: str | None = None,
        use_fallback: bool = False,
    ) -> str:
        """Generate a completion from a prompt (with optional system message)."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        return await self.chat(messages, use_fallback)

    async def chat(
        self,
        messages: list[dict[str, str]],
        use_fallback: bool = False,
    ) -> str:
        """Chat with message history, with automatic fallback to OpenRouter."""
        try:
            if use_fallback or not await self._is_vllm_available():
                return await self._openrouter_call(messages)
            return await self._vllm_call(messages)
        except Exception as e:
            if not use_fallback and self.settings.OPENROUTER_API_KEY:
                return await self._openrouter_call(messages)
            raise e

    async def close(self):
        """Close HTTP client connections."""
        if self._vllm_client:
            await self._vllm_client.aclose()
        if self._openrouter_client:
            await self._openrouter_client.aclose()


llm_client = LLMClient()
