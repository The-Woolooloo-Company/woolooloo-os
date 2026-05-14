# Woolooloo AI OS

AI Operating System for Woolooloo Technologies - Multi-agent orchestration platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Woolooloo AI OS                            │
├─────────────────────────────────────────────────────────────────┤
│  Integrations: Linear, Notion, Slack, WhatsApp, Xero            │
├─────────────────────────────────────────────────────────────────┤
│  Agents: Product, Dev, Growth, Sales, Ops, Founder              │
├─────────────────────────────────────────────────────────────────┤
│  AI: vLLM (Qwen3.5-27B) + OpenRouter fallback                   │
├─────────────────────────────────────────────────────────────────┤
│  Backend: FastAPI + Redis/Celery + PostgreSQL                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pip install -e .

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Run with Docker Compose
docker-compose up
```

## Development

```bash
# Start backend
uvicorn src.main:app --reload

# Start Celery worker
celery -A src.workers.celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A src.workers.celery_app beat --loglevel=info
```

## API Endpoints

- `GET /` - Root
- `POST /api/webhooks/linear` - Linear webhook
- `POST /api/webhooks/notion` - Notion webhook
- `POST /api/webhooks/xero` - Xero webhook
- `POST /api/commands/slack` - Slack commands
- `POST /api/commands/whatsapp` - WhatsApp commands
- `GET /api/agents` - List agents
- `POST /api/agents/{name}/run` - Run agent
- `GET /api/status/health` - Health check

## License

Proprietary - Woolooloo Technologies