// GET /api/agents — List all agents with state and definitions

import { NextResponse } from 'next/server';
import { AGENT_DEFINITIONS, agentStore } from '@/lib/agent-state';

export async function GET() {
  const vllmHost = process.env.NEXT_PUBLIC_VLLM_HOST || '';
  const vllmModel = process.env.NEXT_PUBLIC_VLLM_MODEL || '';
  const vllmKey = process.env.NEXT_PUBLIC_VLLM_API_KEY || '';
  const vllmConfigured = !!vllmHost && !!vllmModel && !!vllmKey;

  const agents = AGENT_DEFINITIONS.map(def => {
    const state = agentStore.get(def.id);
    return {
      id: def.id,
      name: def.name,
      displayName: def.displayName,
      category: def.category,
      description: def.description,
      icon: def.icon,
      quickActions: def.quickActions,
      status: state?.status || 'idle',
      runCount: state?.runCount || 0,
      lastRun: state?.lastRun || 'Never',
      lastError: state?.lastError,
      logs: state?.logs.slice(0, 20) || [],
      recentRuns: state?.runs.slice(0, 5) || [],
      apiConfigured: vllmConfigured,
    };
  });

  return NextResponse.json({ agents, vllmConfigured });
}
