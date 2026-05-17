"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentCard } from "./agent-card";
import { AgentDetail } from "./agent-detail";
import type { AgentInfo } from "./types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vllmConfigured, setVllmConfigured] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      setVllmConfigured(data.vllmConfigured || false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const handleQuickAction = async (agentId: string, prompt: string) => {
    setSelectedAgentId(agentId);

    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error || 'Run failed');
      await fetchAgents();
    } catch (err: any) {
      setError(err.message || 'Failed to run agent');
    }
  };

  const handleCollaborate = async (prompt: string) => {
    try {
      const res = await fetch('/api/agents/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, chain: ['product', 'dev', 'ops'] }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error || 'Collaboration failed');
      await fetchAgents();
    } catch (err: any) {
      setError(err.message || 'Collaboration failed');
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display-small text-md-on-surface">AI Agents</h1>
            <p className="text-body-large text-md-on-surface-variant mt-0.5">
              Intelligent automation powered by vLLM (Qwen3.5-27B)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={vllmConfigured ? 'success-tonal' : 'error-tonal'}>
              <span className="material-symbols-rounded text-16 align-middle">
                {vllmConfigured ? 'check_circle' : 'warning'}
              </span>
              {vllmConfigured ? 'vLLM Connected' : 'vLLM Not Configured'}
            </Badge>
            <Button variant="outlined" size="sm" onClick={fetchAgents}>
              <span className="material-symbols-rounded text-18">refresh</span>
            </Button>
          </div>
        </div>

        {/* Collaboration bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="material-symbols-rounded text-24 text-md-primary">group</span>
              <div className="flex-1 min-w-[200px]">
                <p className="text-label-medium text-md-on-surface font-medium">Collaborate (Product → Dev → Ops)</p>
                <p className="text-body-small text-md-on-surface-variant">Chain multiple agents in sequence — each builds on the previous output</p>
              </div>
              <Input
                placeholder="Enter a prompt for all agents..."
                className="max-w-md"
              />
              <Button variant="filled" onClick={() => handleCollaborate('Analyze the current state and plan next steps.')}>
                <span className="material-symbols-rounded text-18 mr-1">rocket_launch</span>
                Run Chain
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-2xl bg-md-error-container text-md-on-error-container p-4 mb-6 flex items-center gap-3">
            <span className="material-symbols-rounded text-20">error</span>
            <p className="text-label-large flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <span className="material-symbols-rounded text-18">close</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Cards */}
          <div className="lg:col-span-2 space-y-4">
            {loading && agents.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
              </div>
            ) : (
              agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                  onQuickAction={handleQuickAction}
                  vllmConfigured={vllmConfigured}
                />
              ))
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedAgent ? (
              <AgentDetail agent={selectedAgent} onRefresh={fetchAgents} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30">psychology</span>
                    <p className="text-body-large text-md-on-surface-variant mt-4">Select an agent to view details</p>
                    <p className="text-body-medium text-md-on-surface-variant/60 mt-2">
                      Click any agent card above to see logs, run history, and execute prompts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
