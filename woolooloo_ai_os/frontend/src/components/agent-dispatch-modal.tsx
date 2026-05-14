"use client";

import { useState, useMemo } from "react";
import { AGENTS, AgentId } from "@/lib/constants";
import { dispatchAgent } from "@/lib/closed-loop";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AgentDispatchModalProps {
  projects?: { id: string; name: string }[];
  onClose: () => void;
  onDispatch: (dispatch: any) => void;
}

export function AgentDispatchModal({ projects, onClose, onDispatch }: AgentDispatchModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [dispatching, setDispatching] = useState(false);

  const agentDetails = useMemo(() => {
    if (!selectedAgent) return null;
    return AGENTS.find(a => a.id === selectedAgent);
  }, [selectedAgent]);

  const handleDispatch = async () => {
    if (!selectedAgent || !prompt.trim()) return;
    setDispatching(true);
    try {
      const dispatch = await dispatchAgent({
        agentId: selectedAgent,
        prompt: prompt.trim(),
        projectId: selectedProject || undefined,
      });
      onDispatch(dispatch);
      onClose();
    } catch (err) {
      console.error('Agent dispatch failed:', err);
    } finally {
      setDispatching(false);
    }
  };

  const colorMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary",
    secondary: "bg-md-secondary text-md-on-secondary",
    tertiary: "bg-md-tertiary text-md-on-tertiary",
    info: "bg-info text-on-info",
    success: "bg-success text-on-success",
    warning: "bg-warning text-on-warning",
    error: "bg-md-error text-md-on-error",
  };

  const containerMap: Record<string, string> = {
    primary: "bg-md-primary-container text-md-on-primary-container",
    secondary: "bg-md-secondary-container text-md-on-secondary-container",
    tertiary: "bg-md-tertiary-container text-md-on-tertiary-container",
    info: "bg-info-container text-info",
    success: "bg-success-container text-on-success-container",
    warning: "bg-warning-container text-on-warning-container",
    error: "bg-md-error-container text-md-on-error-container",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-symbols-rounded text-28">smart_toy</span>
            Dispatch Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Selection */}
          <div>
            <p className="text-label-medium text-md-on-surface-variant mb-3">Select Agent</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AGENTS.map(agent => (
                <button
                  key={agent.id}
                  type="button"
                  className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all duration-200 min-h-[48px] ${
                    selectedAgent === agent.id
                      ? `${colorMap[agent.color] || colorMap.primary} shadow-md-1`
                      : "bg-md-surface-container/50 hover:bg-md-surface-container"
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <span className="material-symbols-rounded text-20">{agent.icon}</span>
                  <div className="min-w-0">
                    <p className="text-label-large truncate">{agent.name}</p>
                    <p className={`text-body-small truncate ${
                      selectedAgent === agent.id ? "opacity-90" : "text-md-on-surface-variant"
                    }`}>
                      {agent.description.substring(0, 40)}...
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected agent info */}
          {agentDetails && (
            <Badge variant="primary-tonal" className="inline-flex gap-1">
              <span className="material-symbols-rounded text-14">{agentDetails.icon}</span>
              {agentDetails.name} selected
            </Badge>
          )}

          {/* Prompt */}
          <div>
            <Textarea
              label="What should the agent do?"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Fix the login redirect bug. SSO users get a 404 after authentication..."
              rows={4}
              autoFocus
            />
            <p className="text-body-small text-md-on-surface-variant mt-1">
              Tip: Use <code className="text-md-primary">@agent-name</code> in task descriptions for quick dispatch
            </p>
          </div>

          {/* Project Selection */}
          {projects && projects.length > 0 && (
            <div>
              <label className="text-label-medium text-md-on-surface-variant block mb-1.5 ml-1">
                Project <span className="text-md-on-surface-variant/60">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 rounded-full text-label-medium font-medium transition-all duration-200 min-h-[48px] ${
                    !selectedProject
                      ? "bg-md-primary text-md-on-primary shadow-md-1"
                      : "bg-md-surface-container/50 text-md-on-surface hover:bg-md-surface-container"
                  }`}
                  onClick={() => setSelectedProject("")}
                >
                  No project
                </button>
                {projects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`px-3 py-2 rounded-full text-label-medium font-medium transition-all duration-200 min-h-[48px] ${
                      selectedProject === p.id
                        ? "bg-md-primary text-md-on-primary shadow-md-1"
                        : "bg-md-surface-container/50 text-md-on-surface hover:bg-md-surface-container"
                    }`}
                    onClick={() => setSelectedProject(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button
              variant="filled"
              onClick={handleDispatch}
              disabled={!selectedAgent || !prompt.trim() || dispatching}
            >
              <span className="material-symbols-rounded text-18 mr-1">
                {dispatching ? 'refresh' : 'rocket_launch'}
              </span>
              {dispatching ? 'Dispatching...' : 'Dispatch Agent'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
