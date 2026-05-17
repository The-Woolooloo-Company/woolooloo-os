// GET /api/agents/:agentId - Get agent details
// DELETE /api/agents/:agentId - Clear agent state

import { NextResponse } from 'next/server';
import { AGENT_DEFINITIONS, agentStore } from '@/lib/agent-state';

const VALID_IDS = AGENT_DEFINITIONS.map(a => a.id);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const def = AGENT_DEFINITIONS.find(a => a.id === agentId)!;
  const state = agentStore.get(agentId);

  return NextResponse.json({
    def,
    state: state || {
      id: agentId,
      name: def.name,
      displayName: def.displayName,
      status: 'idle' as const,
      runCount: 0,
      lastRun: 'Never',
      logs: [],
      runs: [],
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const def = AGENT_DEFINITIONS.find(a => a.id === agentId)!;
  agentStore.set(agentId, {
    id: agentId,
    name: def.name,
    displayName: def.displayName,
    status: 'idle',
    runCount: 0,
    lastRun: 'Never',
    logs: [],
    runs: [],
  });

  return NextResponse.json({ success: true, message: 'Agent state cleared' });
}
