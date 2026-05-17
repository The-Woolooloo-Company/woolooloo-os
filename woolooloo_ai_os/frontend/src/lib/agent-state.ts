// Shared in-memory agent state for all agent API routes.
// In Docker (single server process), this survives across requests.

export interface AgentLog {
  id: string;
  agentId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'stream' | 'task';
  message: string;
  data?: Record<string, any>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  prompt: string;
  response: string;
  status: 'running' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
  error?: string;
  linearTasksCreated?: string[];
}

export interface AgentState {
  id: string;
  name: string;
  displayName: string;
  status: 'idle' | 'running' | 'error';
  runCount: number;
  lastRun: string;
  lastError?: string;
  logs: AgentLog[];
  runs: AgentRun[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string;
  icon: string;
  systemPrompt: string;
  quickActions: { label: string; prompt: string; icon: string }[];
}

const MAX_LOGS = 200;
const MAX_RUNS = 50;

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'product',
    name: 'Product Agent',
    displayName: 'Product',
    category: 'Product',
    description: 'Product strategy, requirements analysis, and backlog management',
    icon: 'lightbulb',
    systemPrompt: `You are the Product Agent for Woolooloo OS — a product strategy expert.

Responsibilities:
1. Analyze product requirements and suggest features
2. Prioritize backlog items based on impact and effort
3. Review user feedback and translate to product decisions
4. Create Linear tasks for approved features
5. Estimate effort and identify dependencies

When given a prompt, provide:
- Analysis with reasoning
- Recommended actions with priorities
- Suggested Linear tasks (title, description, priority, project)
- Dependencies and risks

Format task suggestions as:
TASK: [Priority: P0-P3] [Project: project-name] Title
Description: detailed description`,
    quickActions: [
      { label: 'Analyze backlog', prompt: 'Analyze our current task backlog and suggest prioritization changes based on business impact.', icon: 'priority_high' },
      { label: 'Feature ideas', prompt: 'Review the current codebase and suggest 3 high-impact features we should build next.', icon: 'rocket_launch' },
      { label: 'Sprint planning', prompt: 'Help plan the next sprint. Review open tasks and suggest what to include.', icon: 'calendar_month' },
    ],
  },
  {
    id: 'dev',
    name: 'Dev Agent',
    displayName: 'Dev',
    category: 'Development',
    description: 'Code review, architecture decisions, and development automation',
    icon: 'code',
    systemPrompt: `You are the Development Agent for Woolooloo OS — a senior software engineer.

Stack: Next.js 15, TypeScript, Tailwind CSS v4, Material Design 3, Recharts.
Integrations: Linear (tasks), Clockify (time tracking), Docker (deployment), vLLM (AI).

Responsibilities:
1. Review code quality and suggest improvements
2. Architect new features and components
3. Debug issues and suggest fixes
4. Create implementation tasks in Linear
5. Write technical documentation

Provide code snippets, architecture diagrams in text, and concrete implementation steps.`,
    quickActions: [
      { label: 'Code review', prompt: 'Review the codebase structure and identify code quality issues or architectural improvements.', icon: 'rule' },
      { label: 'Debug', prompt: 'Analyze the current codebase for potential bugs or edge cases that need fixing.', icon: 'bug_report' },
      { label: 'Architecture', prompt: 'Design the architecture for real-time collaboration features.', icon: 'architecture' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    displayName: 'Growth',
    category: 'Growth',
    description: 'Marketing strategy, analytics, and growth optimization',
    icon: 'trending_up',
    systemPrompt: `You are the Growth Agent for Woolooloo OS — a growth marketing expert.

Responsibilities:
1. Analyze growth metrics and KPIs
2. Suggest acquisition and retention strategies
3. Plan marketing campaigns
4. Optimize conversion funnels

Provide data-driven analysis, growth strategy recommendations, campaign plans with expected ROI.`,
    quickActions: [
      { label: 'Growth plan', prompt: 'Create a 30-day growth plan with specific metrics and actions.', icon: 'trending_up' },
      { label: 'SEO audit', prompt: 'Suggest SEO improvements for our product pages and documentation.', icon: 'search' },
      { label: 'Campaign', prompt: 'Design a marketing campaign to attract new enterprise clients.', icon: 'campaign' },
    ],
  },
  {
    id: 'ops',
    name: 'Ops Agent',
    displayName: 'Ops',
    category: 'Operations',
    description: 'Infrastructure, deployment, monitoring, and DevOps',
    icon: 'settings',
    systemPrompt: `You are the Operations Agent for Woolooloo OS — a DevOps engineer.

Stack: Docker on Ubuntu (192.168.1.161), Next.js (port 3000), vLLM/Qwen3.5-27B (port 6000), Portainer, GitHub Actions.

Responsibilities:
1. Monitor system health and performance
2. Plan and execute deployments
3. Optimize infrastructure costs
4. Security and monitoring

Provide concrete operational steps, shell commands, and deployment strategies.`,
    quickActions: [
      { label: 'Deploy plan', prompt: 'Create a deployment plan for staging and production with rollback strategy.', icon: 'cloud_upload' },
      { label: 'Security audit', prompt: 'Review the current infrastructure for security vulnerabilities and suggest fixes.', icon: 'security' },
      { label: 'Cost analysis', prompt: 'Analyze current infrastructure costs and suggest optimization.', icon: 'payments' },
    ],
  },
  {
    id: 'founder',
    name: 'Founder Agent',
    displayName: 'Founder',
    category: 'Executive',
    description: 'Executive briefing, decision support, and strategic planning',
    icon: 'person',
    systemPrompt: `You are the Founder Agent for Woolooloo OS — an executive assistant to the CEO.

Responsibilities:
1. Provide strategic briefings and summaries
2. Analyze business metrics and trends
3. Support decision-making with data
4. Draft communications and presentations

Provide executive-level summaries with data-backed recommendations and clear next steps.`,
    quickActions: [
      { label: 'Weekly briefing', prompt: 'Prepare a weekly executive briefing covering all active projects, key metrics, and critical decisions needed.', icon: 'article' },
      { label: 'Financial review', prompt: 'Review current revenue, costs, and project profitability. Summarize key financial metrics.', icon: 'account_balance' },
      { label: 'Strategy', prompt: 'Assess our current product strategy and suggest strategic pivots or optimizations.', icon: 'groups' },
    ],
  },
];

// ─── State Store ────────────────────────────────────────────────────────

export const agentStore = new Map<string, AgentState>();

function initState(agent: AgentDefinition): AgentState {
  return {
    id: agent.id,
    name: agent.name,
    displayName: agent.displayName,
    status: 'idle',
    runCount: 0,
    lastRun: 'Never',
    logs: [],
    runs: [],
  };
}

for (const agent of AGENT_DEFINITIONS) {
  if (!agentStore.has(agent.id)) {
    agentStore.set(agent.id, initState(agent));
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

export function addLog(agentId: string, level: AgentLog['level'], message: string, data?: Record<string, any>) {
  const state = agentStore.get(agentId);
  if (!state) return;

  state.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentId,
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  });
  if (state.logs.length > MAX_LOGS) state.logs.pop();
}

export function getAgentState(agentId: string): AgentState | undefined {
  return agentStore.get(agentId);
}

export function getAllAgents(): Array<{ def: AgentDefinition; state: AgentState }> {
  return AGENT_DEFINITIONS.map(def => ({ def, state: agentStore.get(def.id) || initState(def) }));
}

export function recordRun(agentId: string, run: AgentRun) {
  const state = agentStore.get(agentId);
  if (!state) return;
  state.runs.unshift(run);
  if (state.runs.length > MAX_RUNS) state.runs.pop();
  state.runCount++;
  state.lastRun = new Date().toLocaleTimeString();
  state.status = run.status === 'error' ? 'error' : 'idle';
  state.lastError = run.status === 'error' ? run.error : undefined;
}
