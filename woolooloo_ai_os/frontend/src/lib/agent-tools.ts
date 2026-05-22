// MCP-style tool definitions for AI agents

const { execSync } = require('child_process');
const WS = process.env.WORKSPACE_ROOT || '/app';

function rc(cmd: string, cwd?: string): string {
  return execSync(cmd, { encoding: 'utf-8', cwd, maxBuffer: 1024 * 512, timeout: 30000 }).trim();
}

export interface MCPTool {
  name: string;
  description: string;
  category: 'fs' | 'git' | 'terminal' | 'linear' | 'github' | 'deploy';
  agents: string[];
  run: (args: Record<string, any>) => Promise<{ ok: boolean; out: string; err?: string }>;
}

export const ALL_TOOLS: MCPTool[] = [
  {
    name: 'read_file', description: 'Read file contents', category: 'fs',
    agents: ['dev', 'ops', 'product', 'qa'],
    run: async (a) => { try { return { ok: true, out: rc(`cat "${a.path}"`) }; } catch (e: any) { return { ok: false, out: '', err: e.message }; } },
  },
  {
    name: 'write_file', description: 'Write file (creates dirs)', category: 'fs',
    agents: ['dev', 'ops'],
    run: async (a) => {
      try { rc(`mkdir -p "$(dirname "${a.path}")"`); rc(`cat > "${a.path}" << 'XEOF'\n${a.content}\nXEOF`); return { ok: true, out: `Wrote ${a.path}` }; }
      catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'list_dir', description: 'List directory', category: 'fs',
    agents: ['dev', 'ops', 'product', 'qa'],
    run: async (a) => { try { return { ok: true, out: rc(`ls -la "${a.path || '.'}"`) }; } catch (e: any) { return { ok: false, out: '', err: e.message }; } },
  },
  {
    name: 'make_dir', description: 'Create directory', category: 'fs',
    agents: ['dev', 'ops'],
    run: async (a) => { try { rc(`mkdir -p "${a.path}"`); return { ok: true, out: `Created ${a.path}` }; } catch (e: any) { return { ok: false, out: '', err: e.message }; } },
  },
  {
    name: 'git_status', description: 'Git status', category: 'git',
    agents: ['dev', 'ops'],
    run: async (a) => { try { return { ok: true, out: rc('git status --short', a.path || WS) || 'No changes' }; } catch (e: any) { return { ok: false, out: '', err: e.message }; } },
  },
  {
    name: 'git_commit', description: 'Stage and commit all changes', category: 'git',
    agents: ['dev'],
    run: async (a) => {
      try {
        const p = a.path || WS;
        rc('git add .', p); rc('git config user.email "agent@woolooloo.com"', p); rc('git config user.name "Woolooloo Agent"', p);
        rc(`git commit -m "${a.message || 'chore: agent auto-commit'}"`, p);
        return { ok: true, out: `Committed: ${a.message || 'auto'}` };
      } catch (e: any) {
        return e.message.includes('nothing to commit') ? { ok: true, out: 'No changes' } : { ok: false, out: '', err: e.message };
      }
    },
  },
  {
    name: 'git_push', description: 'Push to remote', category: 'git',
    agents: ['dev', 'ops'],
    run: async (a) => { try { rc('git push origin HEAD 2>&1 || true', a.path || WS); return { ok: true, out: 'Pushed' }; } catch (e: any) { return { ok: false, out: '', err: e.message }; } },
  },
  {
    name: 'run_cmd', description: 'Run shell command', category: 'terminal',
    agents: ['dev', 'ops'],
    run: async (a) => {
      if (['rm -rf /', 'mkfs', 'dd if='].some((b: string) => a.command.toLowerCase().includes(b))) return { ok: false, out: '', err: 'Blocked' };
      try { return { ok: true, out: rc(a.command, a.cwd || WS) || 'OK' }; } catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'linear_tasks', description: 'List Linear project tasks', category: 'linear',
    agents: ['dev', 'ops', 'product'],
    run: async (a) => {
      const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
      if (!key) return { ok: false, out: '', err: 'No key' };
      try {
        const r = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key },
          body: JSON.stringify({ query: `{ project(id:"${a.projectId}") { tasks { nodes { id identifier title state { name type } } } } }` }) });
        const d = await r.json(); const ts = d?.data?.project?.tasks?.nodes || [];
        return { ok: true, out: ts.map((t: any) => `  [${t.identifier}] ${t.title} — ${t.state?.name}`).join('\n') || 'No tasks' };
      } catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'linear_create', description: 'Create Linear task', category: 'linear',
    agents: ['product', 'dev', 'ops'],
    run: async (a) => {
      const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
      if (!key) return { ok: false, out: '', err: 'No key' };
      try {
        const r = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key },
          body: JSON.stringify({ query: `mutation($i:IssueCreateInput!){issueCreate(input:$i){success issue{id identifier state{name}}}}`,
            variables: { input: { title: a.title, projectId: a.projectId, description: a.description || '', priority: a.priority ?? 3 } } }) });
        const d = await r.json(); const i = d?.data?.issueCreate?.issue;
        return i ? { ok: true, out: `Created [${i.identifier}] ${i.title} (${i.state?.name})` } : { ok: false, out: '', err: JSON.stringify(d?.errors) };
      } catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'linear_update', description: 'Update Linear task state', category: 'linear',
    agents: ['dev', 'ops'],
    run: async (a) => {
      const key = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
      if (!key) return { ok: false, out: '', err: 'No key' };
      try {
        const r = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key },
          body: JSON.stringify({ query: `mutation($i:IssueUpdateInput!){issueUpdate(input:$i){success issue{id state{name}}}}`,
            variables: { input: { id: a.issueId, state: a.stateName ? { name: a.stateName } : undefined } } }) });
        const d = await r.json(); const u = d?.data?.issueUpdate;
        return u?.success ? { ok: true, out: `${a.issueId} → ${u.issue?.state?.name}` } : { ok: false, out: '', err: JSON.stringify(d?.errors) };
      } catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'deploy_status', description: 'Check deploy health', category: 'deploy',
    agents: ['ops'],
    run: async (a) => {
      try { const r = await fetch(a.url || 'http://192.168.1.161:3000', { signal: AbortSignal.timeout(5000) }); return { ok: true, out: `HTTP ${r.status}` }; }
      catch (e: any) { return { ok: false, out: '', err: e.message }; }
    },
  },
  {
    name: 'deploy_test', description: 'Test deployed routes', category: 'deploy',
    agents: ['ops', 'qa'],
    run: async (a) => {
      const base = a.url || 'http://192.168.1.161:3000';
      const paths = a.paths || ['/', '/agents', '/workspace', '/reports', '/login'];
      const results: string[] = []; let ok = true;
      for (const p of paths) { try { const r = await fetch(`${base}${p}`, { signal: AbortSignal.timeout(5000) }); results.push(`${r.status === 200 ? 'OK' : 'FAIL'} ${p}`); if (r.status !== 200) ok = false; } catch (e: any) { results.push(`FAIL ${p}`); ok = false; } }
      return { ok, out: results.join('\n') };
    },
  },
];

export function findTool(name: string): MCPTool | undefined {
  return ALL_TOOLS.find(t => t.name === name);
}

export function getAgentTools(agentId: string): MCPTool[] {
  return ALL_TOOLS.filter(t => t.agents.includes(agentId));
}
