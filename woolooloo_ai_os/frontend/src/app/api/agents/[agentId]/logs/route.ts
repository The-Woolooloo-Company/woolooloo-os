// GET /api/agents/:agentId/logs - Get agent logs
// DELETE /api/agents/:agentId/logs - Clear agent logs

import { NextRequest, NextResponse } from 'next/server';

const AGENTS = ['product', 'dev', 'growth', 'sales', 'ops', 'founder'];
const logs = new Map<string, Array<{ id: string; agentId: string; timestamp: string; level: string; message: string; data?: any }>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');

  const agentLogs = (logs.get(agentId) || []).slice(0, limit);
  return NextResponse.json({ logs: agentLogs });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  logs.set(agentId, []);
  return NextResponse.json({ success: true, message: 'Logs cleared' });
}
