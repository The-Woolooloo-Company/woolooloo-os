"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgents } from "@/hooks/useAgents";
import type { Agent } from "@/lib/agents";

const AGENT_ICONS: Record<string, string> = {
  product: "lightbulb",
  dev: "code",
  growth: "trending_up",
  sales: "shopping_cart",
  ops: "settings",
  founder: "person",
};

const AGENT_CATEGORIES: Record<string, string> = {
  product: "Product",
  dev: "Development",
  growth: "Growth",
  sales: "Sales",
  ops: "Operations",
  founder: "Executive",
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  product: "Product strategy and analysis",
  dev: "Development automation and code review",
  growth: "Growth marketing and analytics",
  sales: "Sales pipeline and lead management",
  ops: "Operations and infrastructure monitoring",
  founder: "Executive briefing and decision support",
};

export default function AgentsPage() {
  const { agents, loading, error, startAgent } = useAgents();
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});

  const statusColor = (status: string) => {
    if (status === 'idle' || status === 'stopped') return 'success-tonal';
    if (status === 'running') return 'info-tonal';
    if (status === 'error') return 'error-tonal';
    if (status === 'not-configured') return 'secondary-tonal';
    return 'secondary-tonal';
  };

  const handleRun = async (agentId: string) => {
    const prompt = prompts[agentId] || 'Analyze the current state of the project.';
    setRunning(prev => ({ ...prev, [agentId]: true }));
    try {
      const result: any = await startAgent(agentId, prompt);
      if (result.reply) {
        setReplies(prev => ({ ...prev, [agentId]: result.reply }));
      }
    } finally {
      setRunning(prev => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">AI Agents</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Intelligent automation powered by local LLM inference
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-md-error-container text-md-on-error-container p-4 mb-6 flex items-center gap-3">
            <span className="material-symbols-rounded text-20">error</span>
            <p className="text-label-large">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map(agent => {
            const icon = AGENT_ICONS[agent.id] || "smart_toy";
            const category = AGENT_CATEGORIES[agent.id] || agent.displayName || agent.name;
            const description = AGENT_DESCRIPTIONS[agent.id] || agent.description || '';
            const isConfigured = agent.status !== 'not-configured';

            return (
              <Card key={agent.id} className="hover:shadow-md-2 transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-md-primary-container flex items-center justify-center">
                      <span className="material-symbols-rounded text-28 text-md-on-primary-container">{icon}</span>
                    </div>
                    <div>
                      <CardTitle>{category}</CardTitle>
                      <Badge variant={statusColor(agent.status)}>
                        {agent.status === 'not-configured' ? 'vLLM not configured' : agent.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-medium text-md-on-surface-variant mb-4">{description}</p>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-md-outline-variant/50">
                    <div>
                      <p className="text-headline-small font-medium text-md-on-surface">{agent.runCount || 0}</p>
                      <p className="text-label-small text-md-on-surface-variant">Total Runs</p>
                    </div>
                    <div>
                      <p className="text-headline-small font-medium text-md-on-surface">{agent.lastRun || 'Never'}</p>
                      <p className="text-label-small text-md-on-surface-variant">Last Run</p>
                    </div>
                  </div>

                  {agent.lastError && (
                    <div className="rounded-xl bg-md-error-container text-md-on-error-container p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-16">error</span>
                        <p className="text-label-small">{agent.lastError}</p>
                      </div>
                    </div>
                  )}

                  {/* Prompt input */}
                  <div className="mb-4">
                    <Input
                      label="Prompt"
                      value={prompts[agent.id] || ''}
                      onChange={e => setPrompts(prev => ({ ...prev, [agent.id]: e.target.value }))}
                      placeholder={`Ask the ${category.toLowerCase()} agent...`}
                      startIcon={<span className="material-symbols-rounded text-20">smart_toy</span>}
                      disabled={!isConfigured}
                    />
                  </div>

                  {/* Run button */}
                  <Button
                    variant="filled"
                    size="sm"
                    className="w-full mb-4"
                    loading={!!running[agent.id]}
                    disabled={!isConfigured}
                    onClick={() => handleRun(agent.id)}
                  >
                    <span className="material-symbols-rounded text-18 mr-1">play_arrow</span>
                    {running[agent.id] ? 'Running...' : 'Run Agent'}
                  </Button>

                  {/* Reply */}
                  {replies[agent.id] && (
                    <div className="rounded-xl bg-md-secondary-container p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-rounded text-16 text-md-on-secondary-container">smart_toy</span>
                        <p className="text-label-medium text-md-on-secondary-container font-medium">Response</p>
                      </div>
                      <p className="text-body-small text-md-on-secondary-container whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {replies[agent.id].slice(0, 1000)}
                        {replies[agent.id].length > 1000 && '...'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loading && agents.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
          </div>
        )}
      </main>
    </div>
  );
}
