"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentCardProps {
  id: string; name: string; status: "idle" | "running" | "error" | "stopped" | "not-configured";
  lastRun: string; lastError?: string; runCount: number; uptime: number;
  apiConfigured?: boolean;
  onAction?: (agentId: string, action: "start" | "stop" | "restart") => void;
  onViewLogs?: (agentId: string) => void;
  onEditPrompt?: (agentId: string) => void;
}

const configMap: Record<string, { color: string; icon: string; variant: string }> = {
  idle: { color: "bg-md-secondary text-md-on-secondary", icon: "pause_circle", variant: "secondary-tonal" },
  running: { color: "bg-success text-on-success", icon: "play_circle", variant: "success-tonal" },
  error: { color: "bg-md-error text-md-on-error", icon: "error", variant: "error-tonal" },
  stopped: { color: "bg-md-on-surface-variant text-md-on-surface", icon: "stop", variant: "secondary-tonal" },
  "not-configured": { color: "bg-md-on-surface-variant/30 text-md-on-surface-variant", icon: "terminal", variant: "secondary-tonal" },
};

export function AgentCard({
  id, name, status, lastRun, lastError, runCount, uptime,
  apiConfigured = true, onAction, onViewLogs, onEditPrompt,
}: AgentCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const config = configMap[status];

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action);
    try { await onAction?.(id, action); } finally { setActionLoading(null); }
  };

  const formatUptime = (seconds: number): string => {
    if (seconds === 0) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastRun = (isoString: string): string => {
    if (isoString === 'Never') return 'Never';
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="hover:shadow-md-2 transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{name}</CardTitle>
            <Badge variant={config.variant as any} className="mt-1">
              <span className="material-symbols-rounded text-14 mr-1">{config.icon}</span>
              {status === "not-configured" ? "Backend Offline" : status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${config.color}`}>
            <span className="material-symbols-rounded text-20">{config.icon}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-md-error-container text-md-on-error-container">
            <span className="material-symbols-rounded text-18">error</span>
            <p className="text-body-small flex-1">{lastError}</p>
          </div>
        )}

        {!apiConfigured && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-container text-on-warning-container">
            <span className="material-symbols-rounded text-18">warning</span>
            <div>
              <p className="text-body-small">Backend API not running. Agents need the backend server.</p>
              <a href="/config" className="text-md-primary text-body-small hover:underline mt-1 inline-block">Go to Configuration</a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-body-small text-md-on-surface-variant">
          <span className="material-symbols-rounded text-16">schedule</span>
          Last run: {formatLastRun(lastRun)}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-large text-md-on-surface font-medium">{runCount}</p>
            <p className="text-label-small text-md-on-surface-variant">Runs</p>
          </div>
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-large text-md-on-surface font-medium">{formatUptime(uptime)}</p>
            <p className="text-label-small text-md-on-surface-variant">Uptime</p>
          </div>
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-large text-md-on-surface font-medium">98%</p>
            <p className="text-label-small text-md-on-surface-variant">Success</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="filled" size="sm" className="flex-1" onClick={() => handleAction("start")} disabled={status === "running"}>
            <span className={`material-symbols-rounded text-16 mr-1 ${actionLoading === "start" ? "animate-spin" : ""}`}>play_arrow</span>
            Start
          </Button>
          <Button variant="outlined" size="sm" className="flex-1" onClick={() => handleAction("stop")} disabled={status === "idle" || status === "stopped"}>
            <span className={`material-symbols-rounded text-16 mr-1 ${actionLoading === "stop" ? "animate-spin" : ""}`}>stop</span>
            Stop
          </Button>
          <Button variant="outlined" size="sm" className="flex-1" onClick={() => handleAction("restart")}>
            <span className={`material-symbols-rounded text-16 mr-1 ${actionLoading === "restart" ? "animate-spin" : ""}`}>refresh</span>
            Restart
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="tonal" size="sm" className="flex-1" onClick={() => onViewLogs?.(id)}>
            <span className="material-symbols-rounded text-16 mr-1">terminal</span>Logs
          </Button>
          <Button variant="tonal" size="sm" className="flex-1" onClick={() => onEditPrompt?.(id)}>
            <span className="material-symbols-rounded text-16 mr-1">edit_note</span>Prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
