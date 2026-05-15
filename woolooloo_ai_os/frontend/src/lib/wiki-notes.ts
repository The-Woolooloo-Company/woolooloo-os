export interface WikiNote {
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string[];
  project?: string;
  client?: string;
  lastUpdated?: string;
}

export const WIKI_NOTES: WikiNote[] = [
  {
    title: "Woolooloo OS Architecture",
    slug: "woolooloo-os-architecture",
    description: "High-level architecture of the AI Operating System",
    content:
      "# Woolooloo OS Architecture\n\n" +
      "The AI OS integrates Linear, Clockify, GitHub, and AI agents into a unified command center.\n\n" +
      "## Core Components\n" +
      "- Dashboard: Real-time overview of projects, tasks, and time tracking\n" +
      "- Agent Dispatch: Send tasks to AI agents (Pi, Claude, GPT)\n" +
      "- Closed Loop Engine: AI-powered task analysis and recommendations\n" +
      "- Reporting: Automated reports combining Linear + Clockify data\n\n" +
      "## Tech Stack\n" +
      "- Next.js 15 (App Router)\n" +
      "- Tailwind CSS v4 + Material Design 3\n" +
      "- Linear GraphQL API\n" +
      "- Clockify REST API\n" +
      "- GitHub REST API",
    tags: ["architecture", "woolooloo", "overview"],
    project: "Woolooloo OS",
    client: "Woolooloo",
    lastUpdated: "2025-05-11",
  },
  {
    title: "Linear API Setup",
    slug: "linear-api-setup",
    description: "Configuration and authentication for the Linear API integration",
    content:
      "# Linear API Setup\n\n" +
      "## Authentication\n" +
      "- API key format: `lin_api_xxxx` (NOT `Bearer lin_api_xxxx`)\n" +
      "- Webhook secret: `lin_wh_xxxx`\n\n" +
      "## Key Queries\n" +
      "- `projects(filter: {name: {contains: \"...\"}})`\n" +
      "- `issues(filter: {project: {id: {eq: \"...\"}}})`\n" +
      "- `users` (returns staff for sync)\n\n" +
      "## Gotchas\n" +
      "- Auth header: `Authorization: lin_api_xxxx` (no Bearer prefix)\n" +
      "- Issues need `project { id name }` explicitly requested\n" +
      "- States use `id` and `name`, not `status`",
    tags: ["api", "linear", "setup"],
    project: "Woolooloo OS",
    client: "Woolooloo",
  },
  {
    title: "Clockify API Gotchas",
    slug: "clockify-api-gotchas",
    description: "Known issues and workarounds for the Clockify API",
    content:
      "# Clockify API Gotchas\n\n" +
      "## Endpoint Requirements\n" +
      "- Must use `/workspaces/` (plural, not singular)\n" +
      "- Per-user pagination only (200 entries max per page)\n" +
      "- `/workspaces/{id}/time-entries` returns 3000 error on this plan\n\n" +
      "## Duration Parsing\n" +
      "- Returns ISO 8601 durations: `PT2H34M5S`\n" +
      "- Must parse with regex for hours, minutes, seconds\n" +
      "- Convert to total seconds for calculations\n\n" +
      "## Pagination Strategy\n" +
      "- Fetch all users from `/workspaces/{id}/users`\n" +
      "- Loop through each user with `/workspaces/{ws}/user/{userId}/time-entries`\n" +
      "- Use `?page=N&count=200` for pagination\n" +
      "- Deduplicate by `timeEntry.id`",
    tags: ["api", "clockify", "gotchas"],
    project: "Woolooloo OS",
    client: "Woolooloo",
  },
  {
    title: "OnGuard Architecture",
    slug: "onguard-architecture",
    description: "Notes on the OnGuard (Netsweeper) project architecture",
    content:
      "# OnGuard Architecture\n\n" +
      "## Overview\n" +
      "OnGuard is a multi-service platform for Netsweeper with AI-powered features.\n\n" +
      "## Repos\n" +
      "- `onGuard-AI-alfred`: AI assistant frontend\n" +
      "- `onGuard-AI-AlfredModel`: ML model training\n" +
      "- `onGuard-AI-Runner`: Job scheduler\n" +
      "- `onGuard-DataExplorer`: Data visualization\n" +
      "- `onguard-infra-*`: Infrastructure components\n\n" +
      "## Project IDs\n" +
      "- Linear: `3a2bc98a...`\n" +
      "- Clockify: `632db72d...`",
    tags: ["architecture", "netsweeper", "onguard"],
    project: "OnGuard",
    client: "Netsweeper",
  },
  {
    title: "PAM Project Notes",
    slug: "pam-project-notes",
    description: "Privileged Access Management project documentation",
    content:
      "# PAM Project Notes\n\n" +
      "## Overview\n" +
      "Privileged Access Management system for Netcore.\n\n" +
      "## Repos\n" +
      "- `PAM-infra-monorepo`: Infrastructure\n" +
      "- `PAM-Runner`: Job runner\n" +
      "- `PAM-Web`: Web application\n\n" +
      "## Project IDs\n" +
      "- Linear: `01bd02de...`\n" +
      "- Clockify: `628dffdb...`",
    tags: ["project-notes", "netcore", "pam"],
    project: "PAM",
    client: "Netcore",
  },
  {
    title: "COACH / KICK Analytics",
    slug: "coach-kick-analytics",
    description: "Zazi Play's COACH analytics platform notes",
    content:
      "# COACH / KICK Analytics\n\n" +
      "## Overview\n" +
      "Analytics platform for Zazi Play with AI coaching capabilities.\n\n" +
      "## Repos\n" +
      "- `COACH-Runner`: Job runner\n" +
      "- `COACH-Web`: Web app\n" +
      "- `COACH-infra-*`: Infrastructure\n" +
      "- `coachAI`: Main AI system\n" +
      "- `coachAIV2`: AI version 2\n\n" +
      "## Project IDs\n" +
      "- Linear: `b84eafe6...`\n" +
      "- Clockify: `68121484...`",
    tags: ["project-notes", "zazi-play", "analytics"],
    project: "COACH",
    client: "Zazi Play",
  },
  {
    title: "Material Design 3 Token Reference",
    slug: "md3-token-reference",
    description: "Design token mapping for the MD3/Tailwind v4 frontend",
    content:
      "# MD3 Token Reference\n\n" +
      "## Brand Colors\n" +
      "- Primary: `oklch(60% 0.2261 13.2)` — Woolooloo Red-Pink\n" +
      "- Secondary: `oklch(60% 0.1715 162.8)` — Teal/Green\n\n" +
      "## Theme System\n" +
      "- Light theme: `:root` in `@layer base`\n" +
      "- Dark theme: `[data-theme=\"dark\"]` in `@layer base`\n" +
      "- Tailwind utilities: `@theme` block with `var()` references\n\n" +
      "## Key Tokens\n" +
      "- `--color-md-surface`: Page background\n" +
      "- `--color-md-on-surface`: Default text color\n" +
      "- `--color-md-surface-container`: Card backgrounds\n" +
      "- `--color-md-primary`: Primary actions and highlights\n" +
      "- `--color-md-outline-variant`: Subtle borders",
    tags: ["design", "frontend", "md3", "tailwind"],
    project: "Woolooloo OS",
    client: "Woolooloo",
  },
];
