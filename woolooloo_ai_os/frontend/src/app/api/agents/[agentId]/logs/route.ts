// GET /api/agents/:agentId/logs - Get agent logs
// DELETE /api/agents/:agentId/logs - Clear agent logs

import { NextRequest, NextResponse } from 'next/server';
import { agentStore, addLog } from '@/lib/agent-state';

const VALID_IDS = ['product', 'dev', 'growth', 'ops', 'founder'];
const MAX_LOGS = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), MAX_LOGS);

  const state = agentStore.get(agentId);
  const agentLogs = state?.logs.slice(0, limit) || [];
  return NextResponse.json({ logs: agentLogs });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const state = agentStore.get(agentId);
  if (state) state.logs = [];
  return NextResponse.json({ success: true, message: 'Logs cleared' });
}
