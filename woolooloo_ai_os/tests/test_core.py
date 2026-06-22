"""Tests for Woolooloo AI OS Backend"""

import pytest
from unittest.mock import AsyncMock, patch
import httpx

from src.config import Settings, get_settings
from src.llm.client import LLMClient


class TestSettings:
    def test_default_settings(self):
        settings = Settings()
        assert settings.APP_NAME == "Woolooloo AI OS"
        assert settings.APP_VERSION == "0.1.0"
        assert settings.VLLM_MODEL == "qwen3.6-27b-fp8"

    def test_get_settings_cached(self):
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2  # LRU cache should return same instance


class TestLLMClient:
    @pytest.fixture
    def client(self):
        return LLMClient(
            model="test-model",
            temperature=0.7,
            max_tokens=1024,
        )

    def test_build_messages(self, client):
        messages = client._build_messages("Hello", "You are helpful")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are helpful"
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "Hello"

    def test_build_messages_no_system(self, client):
        messages = client._build_messages("Hello")
        assert len(messages) == 1
        assert messages[0]["role"] == "user"

    def test_build_completion_payload(self, client):
        messages = [{"role": "user", "content": "test"}]
        payload = client._build_completion_payload(messages)
        assert payload["messages"] == messages
        assert payload["temperature"] == 0.7
        assert payload["max_tokens"] == 1024

    @pytest.mark.asyncio
    async def test_is_vllm_available_false(self, client):
        with patch.object(client, 'vllm_client', new=AsyncMock()):
            client.vllm_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
            available = await client._is_vllm_available()
            assert available is False

    @pytest.mark.asyncio
    async def test_close(self, client):
        client._vllm_client = AsyncMock()
        client._openrouter_client = AsyncMock()
        await client.close()
        assert client._vllm_client.aclose.called
        assert client._openrouter_client.aclose.called
