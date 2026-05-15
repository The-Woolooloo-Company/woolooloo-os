import { useState, useEffect, useCallback } from 'react';
import { agentService, Agent, AgentLog } from '@/lib/agents';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgents();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch agents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (agentId: string) => {
    try {
      setLogsLoading(true);
      const data = await agentService.getAgentLogs(agentId);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const startAgent = useCallback(async (agentId: string, prompt?: string) => {
    try {
      const result = await agentService.runAgent(agentId, prompt || 'Analyze the current state.');
      await fetchAgents();
      return result;
    } catch (err) {
      console.error('Failed to start agent:', err);
      return { success: false, message: 'Failed to run agent' };
    }
  }, [fetchAgents]);

  const stopAgent = useCallback(async (agentId: string) => {
    const result = await agentService.stopAgent(agentId);
    await fetchAgents();
    return result;
  }, [fetchAgents]);

  const restartAgent = useCallback(async (agentId: string) => {
    const result = await agentService.restartAgent(agentId);
    await fetchAgents();
    return result;
  }, [fetchAgents]);

  const clearLogs = useCallback(async (agentId: string) => {
    const success = await agentService.clearAgentLogs(agentId);
    if (success) {
      setLogs([]);
    }
    return success;
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  useEffect(() => {
    if (selectedAgent) {
      fetchLogs(selectedAgent);
    }
  }, [selectedAgent, fetchLogs]);

  return {
    agents,
    loading,
    error,
    selectedAgent,
    setSelectedAgent,
    logs,
    logsLoading,
    startAgent,
    stopAgent,
    restartAgent,
    clearLogs,
    refreshAgents: fetchAgents,
    refreshLogs: () => selectedAgent && fetchLogs(selectedAgent),
  };
}
