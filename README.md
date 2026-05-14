# Woolooloo OS

> **AI-first operations center** for managing clients, projects, tasks, time tracking, and AI agents — all in one place.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Material Design 3 components
- **Backend**: Python 3.10 + FastAPI (FastAPI framework)
- **Database**: PostgreSQL via Prisma ORM
- **Integrations**: Linear (tasks), Clockify (time), GitHub (repos), Xero (accounting), Slack (comms)
- **AI Agents**: Product, Dev, Growth, Sales, Ops, Founder — powered by `pi` harness

## Brand Colors

| Role | Color | Token |
|------|-------|-------|
| Primary (Warm Red-Pink) | `oklch(60% 0.2261 13.2)` | `--md-primary` |
| Secondary (Teal) | `oklch(60% 0.1715 162.8)` | `--md-secondary` |

## Quick Start

```bash
# Frontend
cd woolooloo_ai_os/frontend
cp .env.example .env.local  # Add your API keys
pnpm install
pnpm dev  # Runs on http://localhost:5003

# Backend
cd woolooloo_ai_os
cp .env.example .env
pip install -e .
uvicorn src.main:app --reload --port 8000
```

## Project Structure

```
Woolooloo_OS/
├── woolooloo_ai_os/
│   ├── frontend/          # Next.js app (MD3 + Tailwind v4)
│   │   ├── src/app/       # Route-based pages
│   │   ├── src/components/ # Reusable UI (Card, Badge, Button, etc.)
│   │   ├── src/hooks/     # React hooks (useClients, useStaff, useTimeTracking)
│   │   ├── src/lib/       # Business logic (linear, clockify, github, agents)
│   │   └── public/        # Static assets
│   ├── src/              # Python backend
│   │   ├── agents/       # AI agent implementations
│   │   ├── api/          # FastAPI endpoints
│   │   ├── integrations/ # Linear, Clockify, Xero, Slack
│   │   ├── llm/          # LLM client (pi harness)
│   │   └── workers/      # Celery task queue
│   └── prisma/           # Database schema
└── material-template/    # Reference Material Kit Pro template
```

## Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| [Linear](https://linear.app) | Task/project management | ✅ Active |
| [Clockify](https://clockify.me) | Time tracking | ⚠️ Needs API key refresh |
| [GitHub](https://github.com) | Repository management | ✅ Active |
| Xero | Accounting/finance | 🔌 Configurable |
| Slack | Team communications | 🔌 Configurable |

## Core Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats, charts, recent activity |
| `/login` | Authentication (default: `dustin` / `WooloolooOS!`) |
| `/clients` | Client directory with MD3 cards |
| `/clients/[id]/projects` | Project listing per client |
| `/clients/[id]/projects/[id]` | Project detail with tabs |
| `/tasks` | Task board with Linear integration |
| `/time-tracking` | Time entries with Clockify sync |
| `/reports` | Business analytics & closed-loop metrics |
| `/staff` | Team management |
| `/agents` | AI agent controls (start/stop/logs) |
| `/wiki` | Knowledge base linked to GitHub repos |
| `/config` | System configuration & integrations |
| `/audit` | Activity audit log (timeline) |
| `/leads` | Lead management pipeline |
| `/campaigns` | Marketing campaign tracker |

## Default Credentials

- **Username**: `dustin`
- **Password**: `WooloolooOS!`

## License

Private — The Woolooloo Company
