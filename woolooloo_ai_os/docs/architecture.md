# Woolooloo AI OS - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WOOLOOLOO AI OS                                     │
│                        Multi-Agent Orchestration Platform                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────��───────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   LAYER 0     │           │   LAYER 1     │           │   LAYER 2     │
│  INTEGRATIONS │           │    AGENTS     │           │   EXECUTION   │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ Linear        │           │ Product       │           │ FastAPI       │
│ Notion        │           │ Dev           │           │ Celery        │
│ Slack         │◄─────────►│ Growth        │◄─────────►│ Redis         │
│ WhatsApp      │           │ Sales         │           │ OpenCode      │
│ Xero          │           │ Ops           │           │ vLLM          │
│ vLLM          │           │ Founder       │           │ OpenRouter    │
└───────────────┘           └───────────────┘           └───────────────┘
```

## Agent System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AGENT ORCHESTRATION                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────┐│
│  │ Product  │  │   Dev    │  │  Growth  │  │  Sales   │  │   Ops    │  │Found││
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │  │Agent││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──┬─┘│
│       │             │             │             │             │           │ │
│       ▼             ▼             ▼             ▼             ▼           ▼ │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    BASE AGENT CLASS                                     ││
│  │  - System Prompt (capabilities)                                         ││
│  │  - LLM Client (vLLM/OpenRouter)                                        ││
│  │  - run(trigger, input) → result                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      EXECUTION RESULT                                   ││
│  │  - status: success/error                                                ││
│  │  - output: JSON                                                         ││
│  │  - duration_ms: int                                                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

## Event-Driven Flow (Primary)

```
Linear Webhook                    AI OS Backend                      Outputs
───────────────────────────────────────────────────────────────────────────

     │                              │                                   │
     │ POST /webhooks/linear        │                                   │
     │────────────────────────────►│                                   │
     │                              │                                   │
     │  {                           │                                   │
     │    "action": "create",       │                                   │
     │    "data": {                 │                                   │
     │      "id": "issue-123",      │                                   │
     │      "labels": ["product"]   │                                   │
     │    }                         │                                   │
     │  }                           │                                   │
     │                              │                                   │
     │                              ▼                                   │
     │                    ┌─────────────────┐                            │
     │                    │ Verify Signature│                            │
     │                    └────────┬────────┘                            │
     │                             │                                    │
     │                             ▼                                    │
     │                    ┌─────────────────┐                            │
     │                    │ Identify Agent  │                            │
     │                    │ (from labels)   │                            │
     │                    └────────┬────────┘                            │
     │                             │                                    │
     │                             ▼                                    │
     │                    ┌─────────────────┐                            │
     │                    │  Queue Celery   │                            │
     │                    │     Task        │                            │
     │                    └────────┬────────┘                            │
     │                             │                                    │
     │                             ▼                                    │
     │                    ┌─────────────────┐                            │
     │                    │  Agent Worker   │                            │
     │                    │  (Product Agent)│                            │
     │                    └────────┬────────┘                            │
     │                             │                                    │
     │                             ▼                                    │
     │                    ┌─────────────────┐                            │
     │                    │     vLLM       │                            │
     │                    │  (Qwen3.5-27B) │                            │
     │                    └────────┬────────┘                            │
     │                             │                                    │
     │         ┌────────────────────┼────────────────────┐                │
     │         │                    │                    │                │
     │         ▼                    ▼                    ▼                │
     │  ┌────────────┐      ┌────────────┐      ┌────────────┐          │
     │  │  Linear    │      │  Notion    │      │   Slack    │          │
     │  │  Comment   │      │  Create    │      │  Message   │          │
     │  └────────────┘      │  Spec Doc  │      │  Summary   │          │
     │                      └────────────┘      └────────────┘          │
     │                                                              │
     │                                                              │
     ▼                                                              ▼
┌───────────┐                                               ┌───────────┐
│  Updated  │                                               │ Dashboard │
│  Ticket   │                                               │  Update   │
└───────────┘                                               └───────────┘
```

## Scheduled Heartbeat Flow

```
Celery Beat (Scheduler)                                    Timeline
────────────────────────────────────────────────────────────────────────

     │
     │  ┌─────────────────────────────────────────────────────────────┐
     ├──►│  Every 1 Hour (Hourly Agents)                              │
     │  │  - Ops Agent → Check Xero, update dashboard                │
     │  │  - Product Agent → Check Linear tickets                    │
     │  │  - Dev Agent → Sync with OpenCode                         │
     │  │  - Sales Agent → Process new leads                        │
     │  └─────────────────────────────────────────────────────────────┘
     │
     │  ┌─────────────────────────────────────────────────────────────┐
     ├──►│  Every 1 Day (Daily Agents)                                 │
     │  │  - Founder Agent → Process Notion inbox at 7 AM             │
     │  │  - Growth Agent → Draft campaigns at 9 AM                   │
     │  └─────────────────────────────────────────────────────────────┘
     │
     │  ┌─────────────────────────────────────────────────────────────┐
     └──►│  Every 1 Week (Weekly Agents)                                │
        │  - Founder Agent → Weekly review on Sunday 6 PM              │
        │  - Ops Agent → Weekly revenue report                         │
        └─────────────────────────────────────────────────────────────┘
```

## On-Demand Command Flow

```
User Input                         Command Parser                      Agent
─────────────────────────────────────────────────────────────────────────

     │                                   │                              │
     │ @product write spec for login     │                              │
     │───────────────────────────────────►                              │
     │                                                                     │
     │                                   ▼                                │
     │                          ┌─────────────────┐                       │
     │                          │ Parse Intent    │                       │
     │                          │ - Agent: product│                       │
     │                          │ - Task: write spec                     │
     │                          │ - Args: login    │                     │
     │                          └────────┬────────┘                       │
     │                                   │                                │
     │                                   ▼                                │
     │                          ┌─────────────────┐                       │
     │                          │ Route to Agent │                       │
     │                          └────────┬────────┘                       │
     │                                   │                                │
     │                                   ▼                                │
     │                          ┌─────────────────┐                       │
     │                          │ Queue Celery   │                       │
     │                          │     Task        │                       │
     │                          └────────┬────────┘                       │
     │                                   │                                │
     │                                   ▼                                │
     │                          ┌─────────────────┐                       │
     │                          │ Product Agent  │                       │
     │                          │    Worker       │                       │
     │                          └────────┬────────┘                       │
     │                                   │                                │
     │                                   ▼                                │
     │                          ┌─────────────────┐                       │
     │                          │     vLLM       │                       │
     │                          │  (Qwen3.5-27B) │                       │
     │                          └────────┬────────┘                       │
     │                                   │                                │
     │                                   ▼                                │
     │  ┌──────────────────────────────────────────────────────────────┐ │
     │  │ Generated Output                                          │ │
     │  │ - Spec document in Notion                                   │ │
     │  │ - Linear comment with summary                              │ │
     │  │ - Response to Slack/WhatsApp                               │ │
     │  └──────────────────────────────────────────────────────────────┘ │
     │                                                                     │
     ▼                                                                     ▼
┌───────────┐                                                         ┌────────┐
│  Reply in │                                                         │ Notion │
│  Slack    │                                                         │  Doc   │
└───────────┘                                                         └────────┘
```

## LLM Fallback Strategy

```
Request                              vLLM Check                          Outcome
─────────────────────────────────────────────────────────────────────────────────

     │                                    │                                 │
     │  LLM Request                       │                                 │
     │───────────────────────────────────►                                 │
     │                                    │                                 │
     │                                    ▼                                 │
     │                           ┌─────────────────┐                        │
     │                           │ Check vLLM      │                        │
     │                           │ /health         │                        │
     │                           └────────┬────────┘                        │
     │                                    │                                 │
     │           ┌────────────────────────┼────────────────────────┐       │
     │           │                        │                        │       │
     │           ▼                        ▼                        ▼       │
     │  ┌──────────────┐         ┌──────────────┐         ┌───────────┐ │
     │  │  Available   │         │ Not Available│         │  Error    │ │
     │  │  (200 OK)    │         │ (timeout)   │         │  (500)    │ │
     │  └──────┬───────┘         └──────┬───────┘         └─────┬─────┘ │
     │         │                        │                        │       │
     │         ▼                        ▼                        ▼       │
     │  ┌──────────────┐         ┌──────────────┐         ┌───────────┐ │
     │  │ Use vLLM    │         │ Check OpenRouter        │ Use      │ │
     │  │ (Primary)   │         │ Key Available │         │ OpenRouter│ │
     │  └──────────────┘         └───────┬──────┘         └─────┬─────┘ │
     │                                   │                        │       │
     │                         ┌─────────┴─────────┐             │       │
     │                         ▼                   ▼             │       │
     │                  ┌────────────┐      ┌───────────┐        │       │
     │                  │  Available │      │ Not Set   │        │       │
     │                  │ Use OpenRouter    │  Return Error  │       │
     │                  └─────┬──────┘      └───────────┘        │       │
     │                        │                                 │       │
     │                        ▼                                 ▼       │
     │                  ┌────────────┐                   ┌───────────┐ │
     │                  │ Return     │                   │ Return    │ │
     │                  │ Response   │                   │ Error     │ │
     │                  └────────────┘                   └───────────┘ │
     │                                                                      │
     ▼                                                                      ▼
┌─────────────┐                                                         ┌─────────┐
│ Success     │                                                         │ Failed  │
└─────────────┘                                                         └─────────┘
```

## Database Schema (Prisma)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRISMA SCHEMA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Organization ──────────────┬────────────── Member                           │
│  ├─ id: cuid              │             ├─ id: cuid                        │
│  ├─ name: String          │             ├─ name: String                     │
│  ├─ linearId: String?    │             ├─ email: String (unique)           │
│  ├─ createdAt: DateTime   │             ├─ role: Role (enum)                 │
│  └─ relations:           │             └─ orgId: String                      │
│       ├─ members                           (FK → Organization)             │
│       ├─ agents                                              │
│       └─ tasks                                                │
│                                                                │
│  Agent ──────────────────────────── AgentExecution            │
│  ├─ id: cuid                       ├─ id: cuid                │
│  ├─ name: String (unique)         ├─ agentId: String (FK)      │
│  ├─ status: AgentStatus          ├─ triggerType: TriggerType  │
│  ├─ enabled: Boolean             ├─ input: Json               │
│  ├─ lastRun: DateTime?          ├─ output: Json?             │
│  └─ orgId: String? (FK)         ├─ status: ExecutionStatus   │
│                                  ├─ durationMs: Int?         │
│                                  ├─ error: String?           │
│                                  └─ createdAt: DateTime      │
│                                                                │
│  Task ─────────────────┐   Campaign ──────────── Lead        │
│  ├─ id: cuid           │   ├─ id: cuid          ├─ id: cuid    │
│  ├─ title: String      │   ├─ title: String     ├─ name: String│
│  ├─ source: TaskSource│   ├─ industry: String  ├─ status: Str │
│  ├─ linearId: String?  │   ├─ type: String     ├─ score: Int  │
│  ├─ status: TaskStatus│   ├─ notionId: String?├─ qualified: B  │
│  └─ priority: Int?    │   └─ createdAt: DTime  └─ notionId: S │
│                                                                             │
│  RevenueSnapshot ─────────────────── LinearEvent                           │
│  ├─ id: cuid                        ├─ id: cuid                           │
│  ├─ mrr: Float                      ├─ type: String                       │
│  ├─ arr: Float                      ├─ payload: Json                      │
│  ├─ customers: Int                  ├─ action: String                      │
│  ├─ churnRate: Float?               ├─ processed: Boolean                 │
│  └─ snapshotAt: DateTime            └─ createdAt: DateTime                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
woolooloo_ai_os/
│
├── src/                           # Python backend
│   ├── main.py                     # FastAPI app entry
│   ├── config.py                   # Pydantic settings
│   │
│   ├── api/                        # REST endpoints
│   │   ├── webhooks.py            # Linear/Notion/Xero webhooks
│   │   ├── commands.py            # Slack/WhatsApp commands
│   │   ├── agents.py              # Agent management
│   │   └── status.py             # Health checks
│   │
│   ├── agents/                     # Agent implementations
│   │   ├── base.py               # Base agent class
│   │   ├── product.py            # Product agent
│   │   ├── dev.py                # Dev agent (OpenCode)
│   │   ├── growth.py             # Growth agent
│   │   ├── sales.py              # Sales agent
│   │   ├── ops.py                # Ops agent (Xero)
│   │   └── founder.py            # Founder agent
│   │
│   ├── llm/                        # LLM integration
│   │   └── client.py             # vLLM + OpenRouter fallback
│   │
│   ├── integrations/              # Third-party clients
│   │   ├── linear.py            # Linear API
│   │   ├── notion.py            # Notion API
│   │   ├── slack.py             # Slack bot
│   │   ├── whatsapp.py          # Twilio WhatsApp
│   │   └── xero.py             # Xero API
│   │
│   ├── workers/                   # Celery workers
│   │   ├── celery_app.py        # Celery config + beat schedule
│   │   └── tasks.py            # Celery tasks
│   │
│   ├── opencode/                  # OpenCode integration
│   │   └── client.py           # OpenCode API client
│   │
│   └── models/                    # Data models
│       ├── events.py            # Event models
│       └── agents.py           # Agent prompts & config
│
├── frontend/                      # Next.js dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── config/         # Config page
│   │   │   ├── agents/         # Agents page
│   │   │   └── commands/       # Commands page
│   │   └── components/         # UI components
│   └── package.json
│
├── prisma/
│   └── schema.prisma              # Database schema
│
├── docker-compose.yml             # Full stack deployment
├── Dockerfile                     # Python backend image
├── pyproject.toml                 # Python dependencies
├── AGENTS.md                      # OpenCode rules
└── README.md                      # Documentation
```