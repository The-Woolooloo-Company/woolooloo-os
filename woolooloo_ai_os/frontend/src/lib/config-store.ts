import type { HarnessId } from './constants';

const AGENT_ENABLED_KEY = 'woolooloo-agent-enabled';
const HARNESS_CONFIG_KEY = 'woolooloo-harness-config';

export type ConfigKey =
  | 'LINEAR_API_KEY' | 'LINEAR_WEBHOOK_SECRET'
  | 'CLOCKIFY_API_KEY' | 'CLOCKIFY_WORKSPACE_ID'
  | 'VLLM_HOST' | 'VLLM_MODEL' | 'VLLM_API_KEY'
  | 'OPENROUTER_API_KEY' | 'OPENROUTER_BASE_URL'
  | 'GITHUB_TOKEN' | 'GITHUB_OWNER' | 'GITHUB_REPO'
  | 'BITBUCKET_APP_KEY' | 'BITBUCKET_CONSUMER_KEY' | 'BITBUCKET_CONSUMER_SECRET' | 'BITBUCKET_WORKSPACE'
  | 'JIRA_EMAIL' | 'JIRA_API_TOKEN' | 'JIRA_DOMAIN'
  | 'CONFLUENCE_EMAIL' | 'CONFLUENCE_API_TOKEN' | 'CONFLUENCE_DOMAIN'
  | 'LINKEDIN_CLIENT_ID' | 'LINKEDIN_CLIENT_SECRET' | 'LINKEDIN_REDIRECT_URI'
  | 'LINKEDIN_ACCESS_TOKEN' | 'LINKEDIN_COMPANY_ID'
  | 'FACEBOOK_ACCESS_TOKEN' | 'FACEBOOK_PAGE_ID'
  | 'NOTION_API_KEY' | 'NOTION_FOUNDER_INBOX_ID' | 'NOTION_CAMPAIGNS_DB_ID'
  | 'SLACK_BOT_TOKEN' | 'SLACK_SIGNING_SECRET'
  | 'TWILIO_ACCOUNT_SID' | 'TWILIO_AUTH_TOKEN' | 'TWILIO_WHATSAPP_FROM'
  | 'XERO_CLIENT_ID' | 'XERO_CLIENT_SECRET' | 'XERO_TENANT_ID';

export interface AppConfig {
  LINEAR_API_KEY?: string;
  LINEAR_WEBHOOK_SECRET?: string;
  CLOCKIFY_API_KEY?: string;
  CLOCKIFY_WORKSPACE_ID?: string;
  VLLM_HOST?: string;
  VLLM_MODEL?: string;
  VLLM_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;
  LINKEDIN_ACCESS_TOKEN?: string;
  LINKEDIN_COMPANY_ID?: string;
  FACEBOOK_ACCESS_TOKEN?: string;
  FACEBOOK_PAGE_ID?: string;
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

// ── Safe JSON parsing for localStorage ──

function safeParseJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    return fallback;
  } catch {
    return fallback;
  }
}

// ── API Config (server-only, proxied via API routes) ──

/**
 * Fetch integration status from server-side API.
 * Returns boolean flags — no actual keys are exposed.
 */
export async function fetchConfigStatus(): Promise<{
  linear: boolean;
  clockify: boolean;
  github: boolean;
  vllm: boolean;
}> {
  try {
    const res = await fetch('/api/config/status');
    if (!res.ok) return { linear: false, clockify: false, github: false, vllm: false };
    return res.json();
  } catch {
    return { linear: false, clockify: false, github: false, vllm: false };
  }
}

/**
 * Save API key config via server-side API route.
 * Keys are never stored in localStorage.
 */
export async function saveConfig(updates: Record<ConfigKey, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to save config' }));
      return { success: false, error: errData.error || 'Failed to save config' };
    }
    // Invalidate status cache
    _configStatusCache = null;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * For backward compatibility: getConfig() returns empty object.
 * API routes should read from process.env directly.
 */
export function getConfig(): AppConfig {
  return {};
}

/**
 * For backward compatibility: getToggleConfig() returns empty object.
 */
export function getToggleConfig(): ToggleConfig {
  return {};
}

export function saveToggleConfig(_updates: Partial<ToggleConfig>): void {
  // No-op — toggles are now server-side
}

// ── Agent & Harness Config (non-sensitive, localStorage safe) ──

export function getAgentEnabled(): AgentEnabled {
  return safeParseJson(AGENT_ENABLED_KEY, {
    product: true,
    dev: true,
    growth: false,
    sales: true,
    ops: true,
    founder: false,
  });
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
  });
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
  return false; // No longer used
}

// ── Cached integration status checks ──

let _configStatusCache: Awaited<ReturnType<typeof fetchConfigStatus>> | null = null;

export async function isLinearConfigured(): Promise<boolean> {
  if (!_configStatusCache) _configStatusCache = await fetchConfigStatus();
  return _configStatusCache.linear;
}

export async function isClockifyConfigured(): Promise<boolean> {
  if (!_configStatusCache) _configStatusCache = await fetchConfigStatus();
  return _configStatusCache.clockify;
}

export async function isVllmConfigured(): Promise<boolean> {
  if (!_configStatusCache) _configStatusCache = await fetchConfigStatus();
  return _configStatusCache.vllm;
}

export async function isGithubConfigured(): Promise<boolean> {
  if (!_configStatusCache) _configStatusCache = await fetchConfigStatus();
  return _configStatusCache.github;
}

export async function isBitbucketConfigured(): Promise<boolean> {
  return false; // Not implemented yet
}

export async function isJiraConfigured(): Promise<boolean> {
  return false; // Not implemented yet
}

export async function isConfluenceConfigured(): Promise<boolean> {
  return false; // Not implemented yet
}
