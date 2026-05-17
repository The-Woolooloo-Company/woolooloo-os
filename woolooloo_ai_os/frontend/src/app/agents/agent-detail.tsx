// AgentDetail - Detail panel for selected agent

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AgentInfo } from "./types";

interface Props {
  agent: AgentInfo;
  onRefresh: () => void;
}

function logLevelColor(level: string) {
  switch (level) {
    case 'error': return 'text-[#f7768e]';
    case 'warn': return 'text-[#e0af68]';
    case 'info': return 'text-[#7aa2f7]';
    case 'stream': return 'text-[#9ece6a]';
    case 'task': return 'text-[#bb9af7]';
    case 'debug': return 'text-[#565f89]';
    default: return 'text-[#a9b1d6]';
  }
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

export function AgentDetail({ agent, onRefresh }: Props) {
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [tasksSuggested, setTasksSuggested] = useState(0);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [taskResults, setTaskResults] = useState<Array<{ title: string; linearId: string; error?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [agent.logs.length]);

  const handleRun = async () => {
    if (!prompt.trim() || running) return;

    setRunning(true);
    setReply(null);
    setTasksSuggested(0);
    setTaskResults([]);

    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Run failed');
        return;
      }

      setReply(data.reply);
      setTasksSuggested(data.tasksSuggested || 0);
      setPrompt('');
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to run agent');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateLinearTasks = async () => {
    if (!reply) return;

    setCreatingTasks(true);
    setTaskResults([]);

    try {
      const res = await fetch(`/api/agents/${agent.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentOutput: reply }),
      });

      const data = await res.json();
      setTaskResults(data.tasks || []);
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Task creation failed');
    } finally {
      setCreatingTasks(false);
    }
  };

  const handleClearLogs = async () => {
    await fetch(`/api/agents/${agent.id}/logs`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleViewRun = (run: any) => {
    setReply(run.response);
  };

  return (
    <div className="space-y-4">
      {/* Agent info card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-md-primary">{agent.icon}</span>
              <CardTitle className="text-headline-small">{agent.displayName} Agent</CardTitle>
              <Badge variant={statusColor(agent.status)}>{agent.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Prompt input */}
          <div className="mb-3">
            <Input
              label="Prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={`Ask the ${agent.displayName} agent...`}
              startIcon={<span className="material-symbols-rounded text-20">smart_toy</span>}
            />
          </div>

          <Button variant="filled" className="w-full mb-4" loading={running}
            disabled={!prompt.trim()} onClick={handleRun}>
            <span className="material-symbols-rounded text-18 mr-1">play_arrow</span>
            Run Agent
          </Button>

          {/* Reply */}
          {reply && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-label-medium text-md-on-surface-variant font-medium">Agent Response</p>
                {tasksSuggested > 0 && (
                  <Badge variant="info-tonal">{tasksSuggested} task suggestion{tasksSuggested > 1 ? 's' : ''}</Badge>
                )}
              </div>
              <div className="rounded-xl bg-md-secondary-container/50 p-4 max-h-[250px] overflow-y-auto">
                <pre className="text-body-small text-md-on-secondary-container whitespace-pre-wrap">
                  {reply}
                </pre>
              </div>

              {tasksSuggested > 0 && !creatingTasks && taskResults.length === 0 && (
                <Button variant="outlined" size="sm" className="w-full mt-3"
                  loading={creatingTasks} onClick={handleCreateLinearTasks}>
                  <span className="material-symbols-rounded text-18 mr-1">task_alt</span>
                  Create Linear Tasks ({tasksSuggested})
                </Button>
              )}

              {taskResults.length > 0 && (
                <div className="mt-3 rounded-xl bg-md-surface-container-low p-3">
                  <p className="text-label-small text-md-on-surface-variant mb-2">Created Tasks:</p>
                  {taskResults.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-sm">
                      {task.error ? (
                        <span className="text-md-on-error-container">⚠ {task.title}: {task.error}</span>
                      ) : (
                        <span className="text-md-on-surface">✓ {task.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-md-error-container text-md-on-error-container p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-16">error</span>
                <p className="text-label-small">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto">
                  <span className="material-symbols-rounded text-14">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Recent runs */}
          {agent.recentRuns && agent.recentRuns.length > 0 && (
            <div className="mb-2">
              <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">Recent Runs</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {agent.recentRuns.map(run => (
                  <button key={run.id}
                    className="w-full text-left p-3 rounded-xl bg-md-surface-container-high hover:bg-md-surface-container-highest transition-colors"
                    onClick={() => handleViewRun(run)}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={run.status === 'completed' ? 'success-tonal' : 'error-tonal'}>{run.status}</Badge>
                      <span className="text-label-small text-md-on-surface-variant">
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-body-small text-md-on-surface truncate">{run.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live logs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-headline-small">
              <span className="material-symbols-rounded text-md-primary">dynamic_feed</span>
              Live Logs
            </CardTitle>
            <Button variant="text" size="sm" onClick={handleClearLogs}>
              <span className="material-symbols-rounded text-18">clear_all</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div ref={logRef} className="bg-[#1a1b26] rounded-xl p-3 h-[400px] overflow-y-auto font-mono text-xs leading-relaxed">
            {agent.logs.map((log: any) => (
              <div key={log.id} className="mb-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${logLevelDot(log.level)} mr-1.5 align-middle`} />
                <span className="text-[#565f89] mr-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={logLevelColor(log.level)}>
                  {log.message}
                </span>
              </div>
            ))}
            {agent.logs.length === 0 && (
              <p className="text-[#565f89] text-center py-8">No logs yet. Run the agent to see activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
