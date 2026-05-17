// AgentCard - Single agent card in the grid

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentInfo } from "./types";

interface Props {
  agent: AgentInfo;
  isSelected: boolean;
  onSelect: () => void;
  onQuickAction: (agentId: string, prompt: string) => void;
  vllmConfigured: boolean;
}

function logLevelDot(level: string) {
  switch (level) {
    case 'error': return 'bg-red-400';
    case 'warn': return 'bg-yellow-400';
    case 'info': return 'bg-blue-400';
    case 'stream': return 'bg-green-400';
    case 'task': return 'bg-purple-400';
    default: return 'bg-gray-400';
  }
}

function statusColor(status: string) {
  if (status === 'idle') return 'success-tonal';
  if (status === 'running') return 'info-tonal';
  if (status === 'error') return 'error-tonal';
  return 'secondary-tonal';
}

export function AgentCard({ agent, isSelected, onSelect, onQuickAction, vllmConfigured }: Props) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-md-primary' : 'hover:shadow-md-2'}`}
      onClick={onSelect}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="h-14 w-14 rounded-2xl bg-md-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-32 text-md-on-primary-container">{agent.icon}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-headline-small text-md-on-surface font-medium">{agent.displayName}</h3>
              <Badge variant={statusColor(agent.status)}>
                {agent.status === 'running' ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    Running
                  </span>
                ) : agent.status}
              </Badge>
              <Badge variant="secondary-outlined">{agent.category}</Badge>
            </div>
            <p className="text-body-medium text-md-on-surface-variant mt-1">{agent.description}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-label-small text-md-on-surface-variant">
              <span><span className="font-medium text-md-on-surface">{agent.runCount}</span> runs</span>
              <span>Last: {agent.lastRun}</span>
              {agent.lastError && (
                <span className="text-md-on-error-container">⚠ {agent.lastError.slice(0, 50)}...</span>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {agent.quickActions.map((qa: { label: string; prompt: string; icon: string }, i: number) => (
                <Button key={i} variant="outlined" size="sm"
                  onClick={e => { e.stopPropagation(); onQuickAction(agent.id, qa.prompt); }}
                  disabled={!vllmConfigured}
                  className="text-xs"
                >
                  <span className="material-symbols-rounded text-14 mr-1">{qa.icon}</span>
                  {qa.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Recent logs preview */}
          <div className="w-48 shrink-0 hidden xl:block">
            <p className="text-label-small text-md-on-surface-variant mb-1">Recent Activity</p>
            <div className="space-y-1 max-h-[120px] overflow-hidden">
              {agent.logs.slice(0, 4).map((log: any) => (
                <div key={log.id} className="flex items-start gap-1.5 text-xs">
                  <span className={`h-2 w-2 rounded-full mt-0.5 shrink-0 ${logLevelDot(log.level)}`} />
                  <span className="text-md-on-surface-variant truncate">
                    {log.message.slice(0, 50)}
                  </span>
                </div>
              ))}
              {agent.logs.length === 0 && (
                <p className="text-xs text-md-on-surface-variant/50">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
