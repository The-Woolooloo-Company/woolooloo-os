// GET /api/agents - List all agents with status

import { NextResponse } from 'next/server';

const AGENTS = [
  { id: 'product', name: 'Product Agent', displayName: 'Product', category: 'Product', description: 'Product strategy and analysis agent' },
  { id: 'dev', name: 'Dev Agent', displayName: 'Dev', category: 'Development', description: 'Development automation and code review agent' },
  { id: 'growth', name: 'Growth Agent', displayName: 'Growth', category: 'Growth', description: 'Growth marketing and analytics agent' },
  { id: 'sales', name: 'Sales Agent', displayName: 'Sales', category: 'Sales', description: 'Sales pipeline and lead management agent' },
  { id: 'ops', name: 'Ops Agent', displayName: 'Ops', category: 'Operations', description: 'Operations and infrastructure monitoring agent' },
  { id: 'founder', name: 'Founder Agent', displayName: 'Founder', category: 'Executive', description: 'Executive briefing and decision support agent' },
];

// In-memory state for agent runs
const agentState = new Map<string, { runCount: number; status: string; lastRun: string; lastError?: string }>();

// Initialize with defaults
for (const agent of AGENTS) {
  if (!agentState.has(agent.id)) {
    agentState.set(agent.id, { runCount: 0, status: 'idle', lastRun: 'Never' });
  }
}

export async function GET() {
  const vllmHost = process.env.NEXT_PUBLIC_VLLM_HOST || '';
  const vllmConfigured = !!vllmHost && !!process.env.NEXT_PUBLIC_VLLM_API_KEY;

  const agents = AGENTS.map(agent => ({
    ...agent,
    status: agentState.get(agent.id)?.status || 'idle',
    runCount: agentState.get(agent.id)?.runCount || 0,
    lastRun: agentState.get(agent.id)?.lastRun || 'Never',
    lastError: agentState.get(agent.id)?.lastError,
    uptime: agentState.get(agent.id)?.status === 'running' ? 99.5 : 100,
    apiConfigured: vllmConfigured,
  }));

  return NextResponse.json({ agents, vllmConfigured });
}
