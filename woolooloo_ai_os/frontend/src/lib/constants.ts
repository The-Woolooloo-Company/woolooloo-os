export const GRADIENT_COLORS = ["primary", "info", "success", "warning", "dark", "danger"] as const;

export type GradientColor = (typeof GRADIENT_COLORS)[number];

export type AgentId = 'product' | 'dev' | 'growth' | 'sales' | 'ops' | 'founder';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  color: GradientColor;
  icon: string;
  description: string;
}

export type HarnessId = 'pi' | 'opencode' | 'codex' | 'none';

export interface HarnessOption {
  id: HarnessId;
  name: string;
  description: string;
  icon: string;
}

export const HARNESS_OPTIONS: HarnessOption[] = [
  {
    id: 'pi',
    name: 'Pi',
    description: 'Fast, local, pluggable agents, @mention, closed-loop improvement',
    icon: 'auto_awesome',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Open-source coding agent harness',
    icon: 'code',
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'Anthropic CLI agent',
    icon: 'terminal',
  },
  {
    id: 'none',
    name: 'None',
    description: 'Disabled',
    icon: 'block',
  },
];

export function findHarness(id: HarnessId): HarnessOption {
  return HARNESS_OPTIONS.find((h) => h.id === id) || HARNESS_OPTIONS[0];
}

export function getDefaultHarness(): HarnessId {
  return 'pi';
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'product',
    name: 'Product Agent',
    color: 'primary',
    icon: 'inventory_2',
    description: 'Build features, write specs, assist developers',
  },
  {
    id: 'dev',
    name: 'Dev Agent',
    color: 'success',
    icon: 'code',
    description: 'Code generation, tests, bug fixes via Pi (default harness)',
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    color: 'info',
    icon: 'trending_up',
    description: 'Campaign drafts for plumbers, electricians, caterers',
  },
  {
    id: 'sales',
    name: 'Sales Agent',
    color: 'warning',
    icon: 'payments',
    description: 'Lead qualification and proposal drafting',
  },
  {
    id: 'ops',
    name: 'Ops Agent',
    color: 'danger',
    icon: 'analytics',
    description: 'Revenue tracking, usage monitoring, churn signals',
  },
  {
    id: 'founder',
    name: 'Founder Agent',
    color: 'dark',
    icon: 'person',
    description: 'Convert Notion notes to Linear projects and tasks',
  },
];

export function findAgent(id: AgentId): AgentDefinition {
  return AGENTS.find((a) => a.id === id) || AGENTS[0];
}

export const INTEGRATION_ICONS: Record<string, string> = {
  github: 'code',
  bitbucket: 'repo',
  jira: 'edit_note',
  confluence: 'article',
  linear: 'edit_note',
  clockify: 'schedule',
  slack: 'chat',
  notion: 'article',
  whatsapp: 'sms',
  linkedin: 'language',
  'google-ads': 'ads_click',
  xero: 'account_balance',
  vllm: 'psychology',
};

export function getIntegrationIcon(type: string): string {
  return INTEGRATION_ICONS[type.toLowerCase()] || 'link';
}
