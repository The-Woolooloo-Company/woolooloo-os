from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    # Application
    APP_NAME: str = "Woolooloo AI OS"
    APP_VERSION: str = "0.1.0"
    APP_URL: str = "https://woolooloo.ai"
    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/woolooloo_os"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # vLLM (Primary LLM)
    VLLM_HOST: str = "http://localhost:8000"
    VLLM_MODEL: str = "qwen3.6-27b-fp8"
    VLLM_API_KEY: str | None = None
    VLLM_TIMEOUT: int = 120

    # OpenRouter (Fallback LLM)
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "qwen/qwen3.5-27b"

    # Linear
    LINEAR_API_KEY: str | None = None
    LINEAR_WEBHOOK_SECRET: str | None = None
    LINEAR_TEAM_ID: str | None = None

    # Notion
    NOTION_API_KEY: str | None = None
    NOTION_FOUNDER_INBOX_ID: str | None = None
    NOTION_CAMPAIGNS_DB_ID: str | None = None
    NOTION_LEADS_DB_ID: str | None = None
    NOTION_PROPOSALS_DB_ID: str | None = None

    # Slack
    SLACK_BOT_TOKEN: str | None = None
    SLACK_SIGNING_SECRET: str | None = None
    SLACK_APP_TOKEN: str | None = None

    # WhatsApp (Twilio)
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_WHATSAPP_FROM: str | None = None

    # Xero
    XERO_CLIENT_ID: str | None = None
    XERO_CLIENT_SECRET: str | None = None
    XERO_TENANT_ID: str | None = None

    # OpenCode
    OPENCODE_API_URL: str = "http://localhost:18888"
    OPENCODE_API_KEY: str | None = None

    # Celery Beat Schedule (in minutes)
    HEARTBEAT_1H: int = 60
    HEARTBEAT_1D: int = 1440
    HEARTBEAT_1W: int = 10080

    # Ops Thresholds
    CHURN_RISK_DAYS: int = 30
    CHURN_FAILED_PAYMENTS: int = 2
    REVENUE_DROP_THRESHOLD: float = 0.10
    USAGE_SPIKE_THRESHOLD: float = 0.50


@lru_cache
def get_settings() -> Settings:
    return Settings()
