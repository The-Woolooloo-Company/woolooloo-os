// GET /api/agents/:agentId - Get agent details
// POST /api/agents/:agentId - Start agent
// DELETE /api/agents/:agentId - Stop agent

import { NextRequest, NextResponse } from 'next/server';

const AGENTS = ['product', 'dev', 'growth', 'sales', 'ops', 'founder'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'logs') {
    const logsRes = await fetch(`${request.nextUrl.origin}/api/agents/${agentId}/logs`);
    return logsRes.ok ? logsRes.json().then(data => NextResponse.json(data)) : NextResponse.json({ logs: [] });
  }

  return NextResponse.json({
    agentId,
    name: `${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`,
    status: 'idle',
    runCount: 0,
    lastRun: 'Never',
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: `Agent ${agentId} started` });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: `Agent ${agentId} stopped` });
}
