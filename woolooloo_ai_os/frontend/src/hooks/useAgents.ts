import { useState, useEffect, useCallback } from 'react';
import type { AgentLog, AgentRun } from '@/lib/agent-state';

export interface AgentInfo {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string;
  icon: string;
  quickActions: { label: string; prompt: string; icon: string }[];
  status: string;
  runCount: number;
  lastRun: string;
  lastError?: string;
  logs: AgentLog[];
  recentRuns: AgentRun[];
  apiConfigured: boolean;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vllmConfigured, setVllmConfigured] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      setVllmConfigured(data.vllmConfigured || false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const runAgent = useCallback(async (agentId: string, prompt: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      await fetchAgents();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to run agent' };
    }
  }, [fetchAgents]);

  const createLinearTasks = useCallback(async (agentId: string, agentOutput: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentOutput }),
      });
      const data = await res.json();
      await fetchAgents();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create tasks' };
    }
  }, [fetchAgents]);

  const collaborate = useCallback(async (prompt: string, chain: string[] = ['product', 'dev', 'ops']) => {
    try {
      const res = await fetch('/api/agents/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, chain }),
      });
      const data = await res.json();
      await fetchAgents();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Collaboration failed' };
    }
  }, [fetchAgents]);

  const clearLogs = useCallback(async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/logs`, { method: 'DELETE' });
      await fetchAgents();
      return true;
    } catch {
      return false;
    }
  }, [fetchAgents]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    vllmConfigured,
    runAgent,
    createLinearTasks,
    collaborate,
    clearLogs,
    refresh: fetchAgents,
  };
}
