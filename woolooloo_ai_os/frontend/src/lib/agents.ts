import { getConfig } from './config-store';

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';
}

export type AgentStatus = 'idle' | 'running' | 'error' | 'stopped' | 'not-configured';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  lastRun: string;
  lastError?: string;
  runCount: number;
  uptime: number;
  apiConfigured?: boolean;
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
  type: 'start' | 'stop' | 'restart';
  agentId: string;
  timestamp: string;
  success: boolean;
  message?: string;
}

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      return (data.agents || data).map((a: any) => ({
        id: a.type || a.name,
        name: a.displayName || `${a.name.charAt(0).toUpperCase() + a.name.slice(1)} Agent`,
        status: 'idle',
        lastRun: a.lastRun || 'Never',
        lastError: undefined,
        runCount: a.runCount || 0,
        uptime: a.uptime || 0,
        apiConfigured: true,
      }));
    } catch (error: any) {
      console.error('Failed to fetch agents:', error);
      return this.getMockAgents().map((agent: Agent) => ({
        ...agent,
        apiConfigured: false,
      }));
    }
  },

  async getAgent(agentId: string): Promise<Agent> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents/${agentId}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      const mock = this.getMockAgent(agentId);
      return { ...mock, apiConfigured: false };
    }
  },

  async startAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents/${agentId}/start`, {
        method: 'POST',
      });
      const result = await res.json();
      return {
        type: 'start',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error('Mock: Failed to start agent - API not running', agentId);
      return {
        type: 'start',
        agentId,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Backend API not running',
      };
    }
  },

  async stopAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents/${agentId}/stop`, {
        method: 'POST',
      });
      const result = await res.json();
      return {
        type: 'stop',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error('Mock: Failed to stop agent - API not running', agentId);
      return {
        type: 'stop',
        agentId,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Backend API not running',
      };
    }
  },

  async restartAgent(agentId: string): Promise<AgentAction> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents/${agentId}/restart`, {
        method: 'POST',
      });
      const result = await res.json();
      return {
        type: 'restart',
        agentId,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error('Mock: Failed to restart agent - API not running', agentId);
      return {
        type: 'restart',
        agentId,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Backend API not running',
      };
    }
  },

  async getAgentLogs(agentId: string, limit = 100): Promise<AgentLog[]> {
    try {
      const res = await fetch(
        `${getApiBase()}/api/agents/${agentId}/logs?limit=${limit}`
      );
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return this.getMockLogs(agentId);
    }
  },

  async clearAgentLogs(agentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBase()}/api/agents/${agentId}/logs`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  },

  // Mock data for development
  getMockAgents(): Agent[] {
    return [
      {
        id: 'product',
        name: 'Product Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
      {
        id: 'dev',
        name: 'Dev Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
      {
        id: 'growth',
        name: 'Growth Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
      {
        id: 'sales',
        name: 'Sales Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
      {
        id: 'ops',
        name: 'Ops Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
      {
        id: 'founder',
        name: 'Founder Agent',
        status: 'not-configured',
        lastRun: 'Never',
        runCount: 0,
        uptime: 0,
        apiConfigured: false,
      },
    ];
  },

  getMockAgent(agentId: string): Agent {
    return this.getMockAgents().find((a) => a.id === agentId) || {
      id: agentId,
      name: agentId,
      status: 'not-configured',
      lastRun: 'Never',
      runCount: 0,
      uptime: 0,
      apiConfigured: false,
    };
  },

  getMockLogs(agentId: string): AgentLog[] {
    const levels: ('info' | 'warn' | 'error' | 'debug')[] = [
      'info',
      'info',
      'info',
      'warn',
      'error',
      'debug',
    ];
    
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
      data: i % 3 === 0 ? { taskId: `task-${i}`, duration: Math.random() * 1000 } : undefined,
    }));
  },
};
