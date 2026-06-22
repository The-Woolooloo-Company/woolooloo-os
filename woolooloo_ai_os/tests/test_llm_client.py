"""Tests for LLM client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.llm.client import LLMClient


@pytest.fixture
def mock_settings():
    """Mock settings for LLM client."""
    settings = MagicMock()
    settings.VLLM_HOST = "http://localhost:8000"
    settings.VLLM_MODEL = "test-model"
    settings.VLLM_API_KEY = "test-key"
    settings.VLLM_TIMEOUT = 30
    settings.OPENROUTER_API_KEY = "sk-or-test"
    settings.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
    settings.OPENROUTER_MODEL = "test/or-model"
    settings.APP_NAME = "Test App"
    return settings


@pytest.fixture
def client(mock_settings):
    """Create LLM client with mocked settings."""
    with patch('src.llm.client.get_settings', return_value=mock_settings):
        return LLMClient()


class TestLLMClient:
    """Tests for LLMClient class."""

    def test_init_with_defaults(self, client):
        """Test default initialization."""
        assert client.model == "test-model"
        assert client.temperature == 0.7
        assert client.max_tokens == 4096

    def test_init_with_custom_params(self, mock_settings):
        """Test custom parameter initialization."""
        with patch('src.llm.client.get_settings', return_value=mock_settings):
            custom_client = LLMClient(
                model="custom-model",
                temperature=0.5,
                max_tokens=2048,
            )
            assert custom_client.model == "custom-model"
            assert custom_client.temperature == 0.5
            assert custom_client.max_tokens == 2048

    def test_build_completion_payload(self, client):
        """Test payload building."""
        messages = [{"role": "user", "content": "Hello"}]
        payload = client._build_completion_payload(messages)
        
        assert payload["messages"] == messages
        assert payload["temperature"] == 0.7
        assert payload["max_tokens"] == 4096

    @pytest.mark.asyncio
    async def test_vllm_available_true(self, client):
        """Test vLLM health check returns True."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        client.vllm_client.get = AsyncMock(return_value=mock_response)
        
        assert await client._is_vllm_available() is True

    @pytest.mark.asyncio
    async def test_vllm_available_false(self, client):
        """Test vLLM health check returns False on failure."""
        client.vllm_client.get = AsyncMock(side_effect=Exception("Connection error"))
        
        assert await client._is_vllm_available() is False
