// POST /api/agents/:agentId/tasks - Parse agent output and create Linear tasks

import { NextRequest, NextResponse } from 'next/server';
import { agentStore, addLog, AGENT_DEFINITIONS } from '@/lib/agent-state';

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const VALID_IDS = AGENT_DEFINITIONS.map(a => a.id);

const PROJECT_IDS: Record<string, string> = {
  'woolooloo-os': '78cedd46...',
  'woolsapp': '345aa2f5...',
  'on-guard': '3a2bc98a...',
  'ns-clear': '0295c01f...',
  'pam': '01bd02de...',
  'kick-analytics': 'b84eafe6...',
  'brandication': '5d20d5f6...',
  '7colours': '41d95655...',
};
const DEFAULT_PROJECT_ID = '78cedd46...';

function parsePriority(p: string): 0 | 1 | 2 | 3 {
  if (p.toUpperCase().includes('P0') || p.toUpperCase().includes('URGENT')) return 3;
  if (p.toUpperCase().includes('P1') || p.toUpperCase().includes('HIGH')) return 2;
  if (p.toUpperCase().includes('P2') || p.toUpperCase().includes('MEDIUM')) return 1;
  return 0;
}

function resolveProjectId(projectName: string): string | undefined {
  const lower = projectName.toLowerCase();
  for (const [key, id] of Object.entries(PROJECT_IDS)) {
    if (lower.includes(key)) return id;
  }
  return DEFAULT_PROJECT_ID;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  if (!VALID_IDS.includes(agentId)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const agentOutput = body.agentOutput || '';

    if (!agentOutput) {
      return NextResponse.json({ error: 'No agent output provided' }, { status: 400 });
    }

    // Parse TASK: lines from agent output
    const taskRegex = /TASK:\s*\[Priority:\s*(P[0-3])\]\s*\[Project:\s*([^\]]+)\]\s*([^\n]+?)(?:\nDescription:\s*(.+?))?(?=\nTASK:|\n\n|\n$)/gi;
    const tasks: Array<{ priority: string; project: string; title: string; description?: string }> = [];
    let m;

    while ((m = taskRegex.exec(agentOutput)) !== null) {
      tasks.push({
        priority: m[1],
        project: m[2],
        title: m[3].trim(),
        description: m[4]?.trim(),
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No task suggestions found in output', tasks: [] });
    }

    const apiKey = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Linear API key not configured' }, { status: 503 });
    }

    const createdTasks: Array<{ title: string; linearId: string; error?: string }> = [];

    for (const task of tasks) {
      const projectId = resolveProjectId(task.project);
      if (!projectId) continue;

      const priority = parsePriority(task.priority);
      const title = `[AI] ${task.title}`;
      const description = task.description
        ? `${task.description}\n\n---\n*Created by ${agentId} agent*`
        : `*Created by ${agentId} agent*`;

      const mutation = `
        mutation CreateIssue($input: CreateIssueInput!) {
          createIssue(input: $input) {
            success
            issue { id identifier title }
          }
        }
      `;

      try {
        const res = await fetch(LINEAR_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              input: { title, description, projectId, priority },
            },
          }),
        });

        const data = await res.json();

        if (data.errors) {
          createdTasks.push({ title, linearId: '', error: data.errors[0].message });
          addLog(agentId, 'error', `Linear task failed: ${data.errors[0].message}`);
          continue;
        }

        if (data.data?.createIssue?.success) {
          const issue = data.data.createIssue.issue;
          createdTasks.push({ title, linearId: issue.id });
          addLog(agentId, 'task', `Created Linear task: ${issue.identifier} — "${title}"`);
        }
      } catch (err: any) {
        createdTasks.push({ title, linearId: '', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      agentId,
      totalParsed: tasks.length,
      totalCreated: createdTasks.filter(t => !t.error).length,
      tasks: createdTasks,
    });
  } catch (err: any) {
    console.error(`Agent ${agentId} task creation failed:`, err);
    addLog(agentId, 'error', `Task creation failed: ${err.message}`);
    return NextResponse.json({ error: err.message || 'Task creation failed' }, { status: 500 });
  }
}
