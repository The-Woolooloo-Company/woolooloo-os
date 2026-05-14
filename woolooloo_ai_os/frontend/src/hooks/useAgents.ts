import { useState, useEffect, useCallback } from 'react';
import { agentService, Agent, AgentLog } from '@/lib/agents';
import { telemetryService, TelemetrySummary } from '@/lib/telemetry';

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

  const startAgent = useCallback(async (agentId: string) => {
    const result = await agentService.startAgent(agentId);
    
    telemetryService.recordAgentAction(
      agentId,
      result.success ? 'start' : 'error',
      { message: result.message }
    );

    await fetchAgents();
    return result;
  }, [fetchAgents]);

  const stopAgent = useCallback(async (agentId: string) => {
    const result = await agentService.stopAgent(agentId);
    
    telemetryService.recordAgentAction(
      agentId,
      result.success ? 'stop' : 'error',
      { message: result.message }
    );

    await fetchAgents();
    return result;
  }, [fetchAgents]);

  const restartAgent = useCallback(async (agentId: string) => {
    const result = await agentService.restartAgent(agentId);
    
    telemetryService.recordAgentAction(
      agentId,
      result.success ? 'restart' : 'error',
      { message: result.message }
    );

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

export function useTelemetry() {
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [events, setEvents] = useState<unknown[]>([]);

  useEffect(() => {
    telemetryService.initialize();
    
    const updateTelemetry = () => {
      setSummary(telemetryService.getSummary());
      setEvents(telemetryService.getEvents(50));
    };
    
    updateTelemetry();

    const interval = setInterval(updateTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    events,
    refresh: () => {
      setSummary(telemetryService.getSummary());
      setEvents(telemetryService.getEvents(50));
    },
  };
}
