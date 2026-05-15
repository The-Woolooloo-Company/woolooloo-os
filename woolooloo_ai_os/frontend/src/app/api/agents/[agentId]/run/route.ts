// POST /api/agents/:agentId/run - Run an agent with a prompt using vLLM

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPTS: Record<string, string> = {
  product: 'You are a product strategy expert. Analyze product requirements, user feedback, and market data to provide actionable product recommendations.',
  dev: 'You are a senior software engineer. Review code, suggest improvements, and help with development tasks and architecture decisions.',
  growth: 'You are a growth marketing expert. Analyze marketing data, suggest growth strategies, and provide recommendations for user acquisition and retention.',
  sales: 'You are a sales operations expert. Help manage sales pipelines, optimize lead conversion, and provide sales strategy recommendations.',
  ops: 'You are an operations and infrastructure expert. Monitor systems, analyze operational data, and provide infrastructure recommendations.',
  founder: 'You are an executive assistant. Provide strategic briefings, summarize key metrics, and help with executive decision-making.',
};

const AGENTS = ['product', 'dev', 'growth', 'sales', 'ops', 'founder'];

function getVllmConfig() {
  const host = process.env.NEXT_PUBLIC_VLLM_HOST || process.env.NEXT_PUBLIC_VLLM_HOST || '';
  const model = process.env.NEXT_PUBLIC_VLLM_MODEL || '';
  const apiKey = process.env.NEXT_PUBLIC_VLLM_API_KEY || '';
  return { host, model, apiKey };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  if (!AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const prompt = body.prompt || body.message || 'Analyze the current state of the project.';

    const { host: vllmHost, model: vllmModel, apiKey: vllmKey } = getVllmConfig();

    if (!vllmHost || !vllmModel) {
      return NextResponse.json({ error: 'vLLM not configured. Set NEXT_PUBLIC_VLLM_HOST and NEXT_PUBLIC_VLLM_MODEL in environment.' }, { status: 503 });
    }

    const systemPrompt = SYSTEM_PROMPTS[agentId] || SYSTEM_PROMPTS.dev;

    const response = await fetch(`${vllmHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(vllmKey ? { Authorization: `Bearer ${vllmKey}` } : {}),
      },
      body: JSON.stringify({
        model: vllmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `vLLM error (${response.status}): ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from model.';

    return NextResponse.json({
      success: true,
      reply,
      agentId,
      prompt,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error(`Agent ${agentId} run failed:`, err);
    return NextResponse.json({ error: err.message || 'Failed to run agent' }, { status: 500 });
  }
}
