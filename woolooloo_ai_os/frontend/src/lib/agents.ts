import { getConfig } from './config-store';

export type AgentStatus = 'idle' | 'running' | 'error' | 'stopped' | 'not-configured';

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  status: AgentStatus;
  lastRun: string;
  lastError?: string;
  runCount: number;
  uptime: number;
  apiConfigured?: boolean;
  category?: string;
  description?: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
}

export interface AgentAction {
  type: 'start' | 'stop' | 'restart' | 'run';
  agentId: string;
  timestamp: string;
  success: boolean;
  message?: string;
  reply?: string;
}

/**
 * Calls the Next.js API routes for agents.
 * No external backend needed — agents run through vLLM via API routes.
 */
export const agentService = {
  async getAgents(): Promise<Agent[]> {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.agents || [];
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return this.getMockAgents();
    }
  },

  async getAgent(agentId: string): Promise<Agent> {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      return {
        id: agentId,
        name: agentId,
        displayName: agentId,
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
      };
    }
  },

  async runAgent(agentId: string, prompt: string): Promise<AgentAction> {
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const result = await res.json();
      return {
        type: 'run',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.error || 'Agent completed',
        reply: result.reply,
      };
    } catch (error) {
      console.error('Failed to run agent:', error);
      return {
        type: 'run',
        agentId,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Failed to run agent',
      };
    }
  },

  async startAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`/api/agents/${agentId}?action=start`, { method: 'POST' });
      const result = await res.json();
      return {
        type: 'start',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch {
      return { type: 'start', agentId, timestamp: new Date().toISOString(), success: false, message: 'Failed to start agent' };
    }
  },

  async stopAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`/api/agents/${agentId}?action=stop`, { method: 'POST' });
      const result = await res.json();
      return {
        type: 'stop',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch {
      return { type: 'stop', agentId, timestamp: new Date().toISOString(), success: false, message: 'Failed to stop agent' };
    }
  },

  async restartAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`/api/agents/${agentId}?action=restart`, { method: 'POST' });
      const result = await res.json();
      return {
        type: 'restart',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch {
      return { type: 'restart', agentId, timestamp: new Date().toISOString(), success: false, message: 'Failed to restart agent' };
    }
  },

  async getAgentLogs(agentId: string, limit = 100): Promise<AgentLog[]> {
    try {
      const res = await fetch(`/api/agents/${agentId}?action=logs`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.logs || [];
    } catch {
      return this.getMockLogs(agentId);
    }
  },

  async clearAgentLogs(agentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  getMockAgents(): Agent[] {
    return [
      { id: 'product', name: 'Product Agent', displayName: 'Product', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Product', description: 'Product strategy and analysis agent' },
      { id: 'dev', name: 'Dev Agent', displayName: 'Dev', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Development', description: 'Development automation and code review agent' },
      { id: 'growth', name: 'Growth Agent', displayName: 'Growth', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Growth', description: 'Growth marketing and analytics agent' },
      { id: 'sales', name: 'Sales Agent', displayName: 'Sales', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Sales', description: 'Sales pipeline and lead management agent' },
      { id: 'ops', name: 'Ops Agent', displayName: 'Ops', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Operations', description: 'Operations and infrastructure monitoring agent' },
      { id: 'founder', name: 'Founder Agent', displayName: 'Founder', status: 'idle', lastRun: 'Never', runCount: 0, uptime: 100, category: 'Executive', description: 'Executive briefing and decision support agent' },
    ];
  },

  getMockLogs(agentId: string): AgentLog[] {
    const levels: ('info' | 'warn' | 'error' | 'debug')[] = ['info', 'info', 'info', 'warn', 'error', 'debug'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: `log-${i}`,
      agentId,
      timestamp: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
      level: levels[i % levels.length],
      message: [
        'Agent started successfully',
        'Processing task queue',
        'Completed task: generate_report',
        'Warning: Rate limit approaching',
        'Error: Failed to connect to external API',
        'Debug: Parsing response data',
      ][i % 6],
    }));
  },
};
