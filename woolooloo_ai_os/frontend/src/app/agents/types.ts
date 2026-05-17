import type { AgentLog, AgentRun } from "@/lib/agent-state";

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
