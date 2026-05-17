// POST /api/agents/collaborate - Chain multiple agents in sequence

import { NextRequest, NextResponse } from 'next/server';
import { AGENT_DEFINITIONS, agentStore, addLog, recordRun, type AgentRun } from '@/lib/agent-state';

const DEFAULT_CHAIN = ['product', 'dev', 'ops'];

function getVllmConfig() {
  return {
    host: process.env.NEXT_PUBLIC_VLLM_HOST || '',
    model: process.env.NEXT_PUBLIC_VLLM_MODEL || '',
    apiKey: process.env.NEXT_PUBLIC_VLLM_API_KEY || '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body.prompt || 'Analyze the current state and plan next steps.';
    const chain = body.chain || DEFAULT_CHAIN;

    const { host: vllmHost, model: vllmModel, apiKey: vllmKey } = getVllmConfig();

    if (!vllmHost || !vllmModel) {
      return NextResponse.json({ error: 'vLLM not configured' }, { status: 503 });
    }

    const results: Array<{ agentId: string; reply: string; error?: string }> = [];
    let accumulatedContext = prompt;

    for (const agentId of chain) {
      const def = AGENT_DEFINITIONS.find(a => a.id === agentId);
      if (!def) {
        results.push({ agentId, reply: '', error: 'Agent not found' });
        continue;
      }

      addLog(agentId, 'info', `Collaboration chain: Agent ${agentId}`);

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
            { role: 'user', content: accumulatedContext },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        const errText = await response.text();
        addLog(agentId, 'error', `vLLM error: ${errText.slice(0, 100)}`);
        results.push({ agentId, reply: '', error: errText.slice(0, 100) });
        continue;
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No response.';

      addLog(agentId, 'stream', `Collaboration response (${reply.length} chars)`);

      // Record the run
      const run: AgentRun = {
        id: `collab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        agentId,
        prompt: accumulatedContext.slice(0, 500),
        response: reply,
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      recordRun(agentId, run);

      results.push({ agentId, reply });

      // Build context for next agent
      accumulatedContext = `${accumulatedContext}\n\n--- ${def.displayName} Agent Analysis ---\n${reply}`;
    }

    return NextResponse.json({
      success: true,
      chain,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Collaboration failed:', err);
    return NextResponse.json({ error: err.message || 'Collaboration failed' }, { status: 500 });
  }
}
