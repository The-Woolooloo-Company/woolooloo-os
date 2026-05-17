// POST /api/agents/:agentId/run — Run agent via vLLM, update state and logs

import { NextRequest, NextResponse } from 'next/server';
import { agentStore, AGENT_DEFINITIONS, addLog, recordRun, type AgentRun } from '@/lib/agent-state';

const VALID_IDS = AGENT_DEFINITIONS.map(a => a.id);

function getVllmConfig() {
  return {
    host: process.env.NEXT_PUBLIC_VLLM_HOST || '',
    model: process.env.NEXT_PUBLIC_VLLM_MODEL || '',
    apiKey: process.env.NEXT_PUBLIC_VLLM_API_KEY || '',
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const def = AGENT_DEFINITIONS.find(a => a.id === agentId)!;
  let state = agentStore.get(agentId);
  if (!state) {
    state = {
      id: agentId, name: def.name, displayName: def.displayName,
      status: 'idle', runCount: 0, lastRun: 'Never', logs: [], runs: [],
    };
    agentStore.set(agentId, state);
  }

  try {
    const body = await request.json();
    const prompt = body.prompt || body.message || 'Analyze the current state.';

    const { host: vllmHost, model: vllmModel, apiKey: vllmKey } = getVllmConfig();

    if (!vllmHost || !vllmModel) {
      addLog(agentId, 'error', 'vLLM not configured');
      return NextResponse.json({ error: 'vLLM not configured' }, { status: 503 });
    }

    // Mark running
    state.status = 'running';
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();

    addLog(agentId, 'info', `Run started: "${prompt.slice(0, 80)}..."`, { runId });

    // Context from recent activity
    const recentLogs = state.logs.slice(0, 5).map(l => `[${l.level}] ${l.message}`).join('\n');
    const contextPrompt = recentLogs
      ? `Recent activity:\n${recentLogs}\n\n${prompt}`
      : prompt;

    // Call vLLM
    addLog(agentId, 'debug', `Sending to vLLM (model: ${vllmModel})`);

    const response = await fetch(`${vllmHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(vllmKey ? { Authorization: `Bearer ${vllmKey}` } : {}),
      },
      body: JSON.stringify({
        model: vllmModel,
        messages: [
          { role: 'system', content: def.systemPrompt },
          { role: 'user', content: contextPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text();
      addLog(agentId, 'error', `vLLM error (${response.status}): ${errText.slice(0, 200)}`);
      state.status = 'error';
      state.lastError = errText.slice(0, 200);
      return NextResponse.json({ error: `vLLM error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from model.';
    const tokenUsage = data.usage || {};

    addLog(agentId, 'stream', `Response (${reply.length} chars, ${tokenUsage.total_tokens || '?'} tokens)`);

    // Parse TASK: lines
    const taskMatches = reply.match(/TASK:\s*\[Priority:\s*(P[0-3])\]\s*\[Project:\s*([^\]]+)\]\s*(.+?)(?=\nTASK:|\n\n|\n$)/gi);
    if (taskMatches && taskMatches.length > 0) {
      addLog(agentId, 'task', `Found ${taskMatches.length} task suggestion(s)`);
    }

    // Record the run
    const run: AgentRun = {
      id: runId, agentId, prompt, response: reply,
      status: 'completed', startedAt, completedAt: new Date().toISOString(),
    };
    recordRun(agentId, run);
    addLog(agentId, 'info', 'Run completed successfully');

    return NextResponse.json({
      success: true, reply, agentId, prompt, runId,
      timestamp: new Date().toISOString(), tokenUsage,
      tasksSuggested: taskMatches?.length || 0,
    });
  } catch (err: any) {
    console.error(`Agent ${agentId} run failed:`, err);
    addLog(agentId, 'error', err.message || 'Unknown error');
    state.status = 'error';
    state.lastError = err.message || 'Unknown error';
    return NextResponse.json({ error: err.message || 'Failed to run agent' }, { status: 500 });
  }
}
