// GET /api/agents/tools — List tools
// POST /api/agents/tools — Execute a tool

import { NextRequest, NextResponse } from 'next/server';
import { ALL_TOOLS } from '@/lib/agent-tools';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agentId');
  let tools = ALL_TOOLS;
  if (agentId) tools = tools.filter(t => t.agents.includes(agentId));
  return NextResponse.json({ tools: tools.map(t => ({ name: t.name, description: t.description, category: t.category, agents: t.agents })) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, args = {}, agentId } = body;
    const tool = ALL_TOOLS.find(t => t.name === toolName);
    if (!tool) return NextResponse.json({ success: false, error: `Unknown: ${toolName}` }, { status: 404 });
    if (agentId && !tool.agents.includes(agentId)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const r = await tool.run(args);
    return NextResponse.json({ tool: toolName, success: r.ok, output: r.out, error: r.err });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
