import type { HarnessId } from './constants';

const CONFIG_KEY = 'woolooloo-config';
const TOGGLE_CONFIG_KEY = 'woolooloo-toggle-config';
const AGENT_ENABLED_KEY = 'woolooloo-agent-enabled';
const HARNESS_CONFIG_KEY = 'woolooloo-harness-config';

export interface AppConfig {
  LINEAR_API_KEY?: string;
  LINEAR_WEBHOOK_SECRET?: string;
  CLOCKIFY_API_KEY?: string;
  CLOCKIFY_WORKSPACE_ID?: string;
  VLLM_HOST?: string;
  VLLM_MODEL?: string;
  VLLM_API_KEY?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;
  GOOGLE_ADS_CUSTOMER_ID?: string;
  GOOGLE_ADS_DEVELOPER_TOKEN?: string;
  GOOGLE_ADS_REFRESH_TOKEN?: string;
  GOOGLE_ADS_CLIENT_SECRET?: string;
  GOOGLE_ADS_CLIENT_ID?: string;
  NOTION_API_KEY?: string;
  NOTION_FOUNDER_INBOX_ID?: string;
  NOTION_CAMPAIGNS_DB_ID?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  XERO_CLIENT_ID?: string;
  XERO_CLIENT_SECRET?: string;
  XERO_TENANT_ID?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  BITBUCKET_APP_KEY?: string;
  BITBUCKET_CONSUMER_KEY?: string;
  BITBUCKET_CONSUMER_SECRET?: string;
  BITBUCKET_WORKSPACE?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_DOMAIN?: string;
  CONFLUENCE_EMAIL?: string;
  CONFLUENCE_API_TOKEN?: string;
  CONFLUENCE_DOMAIN?: string;
  LINEAR_SYNC_PROJECTS?: string;
}

export interface ToggleConfig {
  LINEAR_SYNC_PROJECTS?: boolean;
}

export interface AgentEnabled {
  product?: boolean;
  dev?: boolean;
  growth?: boolean;
  sales?: boolean;
  ops?: boolean;
  founder?: boolean;
}

export interface HarnessConfig {
  dev?: HarnessId;
  product?: HarnessId;
  growth?: HarnessId;
  sales?: HarnessId;
  ops?: HarnessId;
  founder?: HarnessId;
}

function safeParseJson(key: string, fallback: unknown): unknown {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Get default config from NEXT_PUBLIC_* env vars (available in browser).
 * This provides fallback values when localStorage is empty.
 */
function getDefaultConfigFromEnv(): AppConfig {
  return {
    LINEAR_API_KEY: process.env.NEXT_PUBLIC_LINEAR_API_KEY,
    LINEAR_WEBHOOK_SECRET: process.env.NEXT_PUBLIC_LINEAR_WEBHOOK_SECRET,
    CLOCKIFY_API_KEY: process.env.NEXT_PUBLIC_CLOCKIFY_API_KEY,
    CLOCKIFY_WORKSPACE_ID: process.env.NEXT_PUBLIC_CLOCKIFY_WORKSPACE_ID,
    VLLM_HOST: process.env.NEXT_PUBLIC_VLLM_HOST,
    VLLM_MODEL: process.env.NEXT_PUBLIC_VLLM_MODEL,
    VLLM_API_KEY: process.env.NEXT_PUBLIC_VLLM_API_KEY,
    GITHUB_TOKEN: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
    GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER,
    GITHUB_REPO: process.env.NEXT_PUBLIC_GITHUB_REPO,
  };
}

export function getConfig(): AppConfig {
  const envDefaults = getDefaultConfigFromEnv();
  const localStorageConfig = safeParseJson(CONFIG_KEY, {}) as AppConfig;
  // Merge: env defaults first, then localStorage overrides
  return { ...envDefaults, ...localStorageConfig };
}

export function saveConfig(updates: Partial<AppConfig>): void {
  if (typeof window === 'undefined') return;
  const current = getConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...updates }));
}

export function getToggleConfig(): ToggleConfig {
  return safeParseJson(TOGGLE_CONFIG_KEY, {}) as ToggleConfig;
}

export function saveToggleConfig(updates: Partial<ToggleConfig>): void {
  if (typeof window === 'undefined') return;
  const current = getToggleConfig();
  localStorage.setItem(TOGGLE_CONFIG_KEY, JSON.stringify({ ...current, ...updates }));
}

export function getAgentEnabled(): AgentEnabled {
  return safeParseJson(AGENT_ENABLED_KEY, {
    product: true,
    dev: true,
    growth: false,
    sales: true,
    ops: true,
    founder: false,
  }) as AgentEnabled;
}

export function saveAgentEnabled(updates: Partial<AgentEnabled>): void {
  if (typeof window === 'undefined') return;
  const current = getAgentEnabled();
  localStorage.setItem(AGENT_ENABLED_KEY, JSON.stringify({ ...current, ...updates }));
}

export function getHarnessConfig(): HarnessConfig {
  return safeParseJson(HARNESS_CONFIG_KEY, {
    dev: 'pi',
    product: 'pi',
    growth: 'pi',
    sales: 'pi',
    ops: 'pi',
    founder: 'pi',
  }) as HarnessConfig;
}

export function saveHarnessConfig(updates: Partial<HarnessConfig>): void {
  if (typeof window === 'undefined') return;
  const current = getHarnessConfig();
  localStorage.setItem(HARNESS_CONFIG_KEY, JSON.stringify({ ...current, ...updates }));
}

export function getAgentHarness(agentId: string): HarnessId {
  const config = getHarnessConfig();
  return (config as Record<string, HarnessId>)[agentId] || 'pi';
}

export function getConfigToggle(key: string): boolean {
  const toggleVal = getToggleConfig();
  const configVal = getConfig();
  const toggleKey = key as keyof ToggleConfig;
  const configKey = key as keyof AppConfig;
  return !!toggleVal[toggleKey] || configVal[configKey] === 'true';
}

export function isLinearConfigured(): boolean {
  return !!getConfig().LINEAR_API_KEY;
}

export function isClockifyConfigured(): boolean {
  const config = getConfig();
  // Clockify only needs API key - workspace ID is auto-detected from /user endpoint
  return !!config.CLOCKIFY_API_KEY;
}

export function isVllmConfigured(): boolean {
  return !!getConfig().VLLM_HOST;
}

export function isGithubConfigured(): boolean {
  return !!getConfig().GITHUB_TOKEN;
}

export function isBitbucketConfigured(): boolean {
  return !!getConfig().BITBUCKET_APP_KEY;
}

export function isJiraConfigured(): boolean {
  const config = getConfig();
  return !!config.JIRA_API_TOKEN && !!config.JIRA_DOMAIN;
}

export function isConfluenceConfigured(): boolean {
  const config = getConfig();
  return !!config.CONFLUENCE_API_TOKEN && !!config.CONFLUENCE_DOMAIN;
}
