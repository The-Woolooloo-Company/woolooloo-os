// Next.js API route: server-side proxy for Clockify with caching
// Bypasses CORS, caches results, supports manual sync
import { NextRequest, NextResponse } from 'next/server';

const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Clockify ↔ Linear project mapping (from clients.ts) ───
const PROJECT_MAP: { clockifyId: string; linearId: string; name: string }[] = [
  { clockifyId: '632db72db64ae80b402f6abc', linearId: '3a2bc98a-7bc8-46e7-bf22-2176a8bc0d32', name: 'On-guard' },
  { clockifyId: '68f675c73437e1165fe35cd6', linearId: '0295c01f-e3ae-4a8d-89b3-7d30f6ad53a5', name: 'NS Clear' },
  { clockifyId: '628dffdb690b30632737fdad', linearId: '01bd02de-8c64-479a-8c0a-9ca43b24ebd6', name: 'Network Core (PAM)' },
  { clockifyId: '68121484c27c4b2ba2ab2dee', linearId: 'b84eafe6-524b-436f-969d-561ffc86bbb3', name: 'KICK Analytics' },
  { clockifyId: '668bdec0f106f36223181af3', linearId: '5d20d5f6-9d1f-4762-b13c-9859a9d73478', name: 'Brandication' },
  { clockifyId: '6a03984e43c3a07a3016ab48', linearId: '41d95655-0161-49b7-89bb-025b013d1e99', name: '7Colours' },
  { clockifyId: '686d20d53aa1ec7de1560c79', linearId: '78cedd46-c15f-45d3-b02d-d20a2593f9d4', name: 'Woolooloo OS' },
];

// Reverse map: Linear projectId → Clockify projectId
const LINEAR_TO_CLOCKIFY = new Map(PROJECT_MAP.map(p => [p.linearId, p.clockifyId]));
// Clockify projectId → Linear projectId
const CLOCKIFY_TO_LINEAR = new Map(PROJECT_MAP.map(p => [p.clockifyId, p.linearId]));

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = {
  users: null as CacheEntry<any[]> | null,
  projects: null as CacheEntry<any[]> | null,
  timeEntries: null as CacheEntry<Record<string, any[]>> | null,
  workspace: null as CacheEntry<string> | null,
  linearTasks: null as CacheEntry<any[]> | null,
  linearProjects: null as CacheEntry<any[]> | null,
};

function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

function clockifyHeaders(): Record<string, string> {
  return { 'x-api-key': getEnvVar('NEXT_PUBLIC_CLOCKIFY_API_KEY') || '' };
}

function linearHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': getEnvVar('NEXT_PUBLIC_LINEAR_API_KEY') || '',
  };
}

async function fetchFromClockify(path: string): Promise<any> {
  const res = await fetch(`${CLOCKIFY_API_URL}${path}`, {
    headers: clockifyHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Clockify API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function linearQuery(query: string): Promise<any> {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: linearHeaders(),
    body: JSON.stringify({ query }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Linear API ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.errors) {
    throw new Error(`Linear GraphQL error: ${data.errors[0]?.message || 'Unknown'}`);
  }
  return data.data;
}

// Score similarity between a Clockify description and a Linear task title
function matchScore(description: string, title: string, identifier: string): number {
  if (!description || !title) return 0;
  const desc = description.toLowerCase();
  const t = title.toLowerCase();
  const id = identifier.toLowerCase();
  let score = 0;
  // Exact title match
  if (desc === t) score += 100;
  // Linear identifier (e.g. OG-123) mentioned in description
  if (desc.includes(id)) score += 80;
  // Title contains words from description
  const descWords = desc.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  for (const w of descWords) {
    if (t.includes(w)) score += 10;
  }
  // Description contains title
  if (desc.includes(t)) score += 50;
  // Title contains description
  if (t.includes(desc)) score += 40;
  return score;
}

function getWorkspaceIdFromEnv(): string | undefined {
  const stored = getEnvVar('NEXT_PUBLIC_CLOCKIFY_WORKSPACE_ID');
  if (stored) {
    const cleaned = stored.replace(/["']/g, '');
    if (cleaned.length === 24 && /^[0-9a-f]+$/.test(cleaned)) return cleaned;
  }
  return undefined;
}

function isCacheValid<T>(entry: CacheEntry<T> | null, forceSync: boolean): entry is CacheEntry<T> {
  if (forceSync || !entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

async function resolveWorkspace(forceSync: boolean): Promise<string> {
  const fromEnv = getWorkspaceIdFromEnv();
  if (fromEnv) return fromEnv;

  if (isCacheValid(cache.workspace, forceSync)) return cache.workspace.data;

  const userData = await fetchFromClockify('/user');
  const ws = userData?.activeWorkspace || userData?.defaultWorkspace || userData?.workspace;
  if (!ws) throw new Error('Could not resolve Clockify workspace ID');

  cache.workspace = { data: ws, timestamp: Date.now() };
  return ws;
}

// Helper: parse Clockify ISO duration (e.g. PT2H34M, PT48S)
function parseClockifyDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0') || 0;
  const m = parseInt(match[2] || '0') || 0;
  const s = parseInt(match[3] || '0') || 0;
  return h * 3600 + m * 60 + s;
}

// GET /api/clockify?type=users|projects|timeentries|all&start=...&end=...&sync=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const forceSync = searchParams.get('sync') === 'true';
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const workspaceId = await resolveWorkspace(forceSync);

    const result: Record<string, any> = {};

    // --- Fetch users (cached) ---
    let usersRaw: any[] = [];
    if (type === 'all' || type === 'users') {
      if (isCacheValid(cache.users, forceSync)) {
        usersRaw = cache.users.data;
      } else {
        usersRaw = (await fetchFromClockify(`/workspaces/${workspaceId}/users`)) || [];
        cache.users = { data: usersRaw, timestamp: Date.now() };
      }
      if (type === 'all') {
        result.users = usersRaw.map((u: any) => ({
          id: u.id,
          userId: u.id,
          userName: u.name || u.email?.split('@')[0] || 'Unknown',
          userEmail: u.email || '',
          billableRate: u.hourlyRate?.amount || 0,
          membershipStatus: u.status || 'UNKNOWN',
        }));
      } else {
        result.users = usersRaw;
      }
    }

    // --- Fetch projects (cached) ---
    let projectsRaw: any[] = [];
    if (type === 'all' || type === 'projects') {
      if (isCacheValid(cache.projects, forceSync)) {
        projectsRaw = cache.projects.data;
      } else {
        projectsRaw = (await fetchFromClockify(`/workspaces/${workspaceId}/projects`)) || [];
        cache.projects = { data: projectsRaw, timestamp: Date.now() };
      }
      if (type === 'all') {
        result.projects = projectsRaw.map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
      } else {
        result.projects = projectsRaw;
      }
    }

    // --- Fetch time entries ---
    if (type === 'all' || type === 'timeentries') {
      // Need users for rate resolution and entry filtering
      if (!usersRaw.length) {
        if (isCacheValid(cache.users, forceSync)) {
          usersRaw = cache.users.data;
        } else {
          usersRaw = (await fetchFromClockify(`/workspaces/${workspaceId}/users`)) || [];
          cache.users = { data: usersRaw, timestamp: Date.now() };
        }
      }

      // Need projects for name resolution
      if (!projectsRaw.length) {
        if (isCacheValid(cache.projects, forceSync)) {
          projectsRaw = cache.projects.data;
        } else {
          projectsRaw = (await fetchFromClockify(`/workspaces/${workspaceId}/projects`)) || [];
          cache.projects = { data: projectsRaw, timestamp: Date.now() };
        }
      }

      const userRateMap = new Map<string, number>();
      const userNameMap = new Map<string, string>();
      const userEmailMap = new Map<string, string>();
      usersRaw.forEach((u: any) => {
        userRateMap.set(u.id, u.hourlyRate?.amount || 0);
        userNameMap.set(u.id, u.name || 'Unknown');
        userEmailMap.set(u.id, u.email || '');
      });

      const projectMap = new Map<string, string>();
      projectsRaw.forEach((p: any) => projectMap.set(p.id, p.name));

      // Only fetch active members
      const activeUsers = usersRaw.filter(
        (u: any) => u.status === 'ACTIVE' || u.status === 'MEMBER' || !u.status,
      );

      const cacheKey = `${startDate || 'all'}-${endDate || 'all'}`;
      if (
        !forceSync &&
        cache.timeEntries &&
        cache.timeEntries.data[cacheKey] &&
        Date.now() - cache.timeEntries.timestamp < CACHE_TTL_MS
      ) {
        result.timeEntries = cache.timeEntries.data[cacheKey];
      } else {
        const allEntries: any[] = [];
        for (const user of activeUsers) {
          const url = `/workspaces/${workspaceId}/user/${user.id}/time-entries`;
          const params = new URLSearchParams({ 'page-size': '200' });
          if (startDate) params.set('dateFrom', startDate);
          if (endDate) params.set('dateTo', endDate);

          const entries = await fetchFromClockify(`${url}?${params.toString()}`);
          (entries || []).forEach((raw: any) => {
            const duration = parseClockifyDuration(raw.timeInterval?.duration || '');
            // Clockify hourlyRate.amount is in minor units (cents for ZAR) → divide by 100
            const entryRate = (raw.hourlyRate?.amount || userRateMap.get(raw.userId) || 0) / 100;

            allEntries.push({
              id: raw.id,
              description: raw.description || '',
              userId: raw.userId,
              userName: userNameMap.get(raw.userId) || 'Unknown',
              userEmail: userEmailMap.get(raw.userId) || '',
              projectId: raw.projectId || '',
              projectName: projectMap.get(raw.projectId) || '',
              start: raw.timeInterval?.start || '',
              end: raw.timeInterval?.end || null,
              duration,
              billable: raw.billable || false,
              billableRate: entryRate,
              billableAmount: raw.billable ? (duration / 3600) * entryRate : 0,
              timeInterval: raw.timeInterval,
              billableTimeRate: raw.billableTimeRate || null,
            });
          });
        }

        // Apply date filter
        let filtered = allEntries;
        if (startDate || endDate) {
          filtered = filtered.filter((e: any) => {
            const entryDate = (e.timeInterval?.start || '').split('T')[0];
            if (startDate && entryDate < startDate) return false;
            if (endDate && entryDate > endDate) return false;
            return true;
          });
        }

        // Sort newest first
        filtered.sort(
          (a: any, b: any) =>
            (b.timeInterval?.start || '').localeCompare(a.timeInterval?.start || ''),
        );

        // Update cache
        if (!cache.timeEntries) cache.timeEntries = { data: {}, timestamp: Date.now() };
        cache.timeEntries.data[cacheKey] = filtered;
        cache.timeEntries.timestamp = Date.now();

        result.timeEntries = filtered;
      }

      // --- Match time entries to Linear tasks ---
      if (type === 'all') {
        // Fetch Linear tasks (cached)
        let linearTasksRaw: any[] = [];
        if (isCacheValid(cache.linearTasks, forceSync)) {
          linearTasksRaw = cache.linearTasks.data;
        } else {
          try {
            const linearData = await linearQuery(`
              query {
                issues(first: 200) {
                  nodes {
                    id
                    title
                    identifier
                    state { id name type }
                    priority
                    project { id name }
                    assignee { id name }
                    createdAt
                    updatedAt
                  }
                }
              }
            `);
            linearTasksRaw = linearData?.issues?.nodes || [];
            cache.linearTasks = { data: linearTasksRaw, timestamp: Date.now() };
          } catch (e: any) {
            console.warn('[Clockify Proxy] Linear fetch failed:', e.message);
          }
        }

        // Build a map of Linear project ID → tasks for fast lookup
        const tasksByLinearProject = new Map<string, any[]>();
        linearTasksRaw.forEach((task: any) => {
          const pid = task.project?.id;
          if (pid) {
            if (!tasksByLinearProject.has(pid)) tasksByLinearProject.set(pid, []);
            tasksByLinearProject.get(pid)!.push(task);
          }
        });

        // For each time entry, find the best matching Linear task
        result.timeEntries = result.timeEntries.map((entry: any) => {
          const linearProjectId = CLOCKIFY_TO_LINEAR.get(entry.projectId);
          const candidateTasks = linearProjectId
            ? tasksByLinearProject.get(linearProjectId) || []
            : linearTasksRaw; // search all if no project mapping

          let bestTask = null;
          let bestScore = 0;

          for (const task of candidateTasks) {
            const score = matchScore(entry.description, task.title, task.identifier);
            if (score > bestScore) {
              bestScore = score;
              bestTask = task;
            }
          }

          // Only attach if score is meaningful (at least 10 points = 1 keyword match)
          if (bestTask && bestScore >= 10) {
            return {
              ...entry,
              matchedLinearTask: {
                id: bestTask.id,
                title: bestTask.title,
                identifier: bestTask.identifier,
                state: bestTask.state,
                priority: bestTask.priority,
                score: bestScore,
              },
            };
          }
          return entry;
        });

        // Also return Linear tasks separately
        result.linearTasks = linearTasksRaw.map((t: any) => ({
          id: t.id,
          title: t.title,
          identifier: t.identifier,
          state: t.state,
          priority: t.priority,
          projectId: t.project?.id,
          projectName: t.project?.name,
          assigneeId: t.assignee?.id,
          assigneeName: t.assignee?.name,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }));
      }
    }

    // --- Fetch Linear tasks only ---
    if (type === 'tasks') {
      let linearTasksRaw: any[] = [];
      if (isCacheValid(cache.linearTasks, forceSync)) {
        linearTasksRaw = cache.linearTasks.data;
      } else {
        try {
          const linearData = await linearQuery(`
            query {
              issues(first: 200) {
                nodes {
                  id
                  title
                  identifier
                  state { id name type }
                  priority
                  project { id name }
                  assignee { id name }
                  createdAt
                  updatedAt
                }
              }
            }
          `);
          linearTasksRaw = linearData?.issues?.nodes || [];
          cache.linearTasks = { data: linearTasksRaw, timestamp: Date.now() };
        } catch (e: any) {
          console.warn('[Clockify Proxy] Linear fetch failed:', e.message);
        }
      }
      result.linearTasks = linearTasksRaw.map((t: any) => ({
        id: t.id,
        title: t.title,
        identifier: t.identifier,
        state: t.state,
        priority: t.priority,
        projectId: t.project?.id,
        projectName: t.project?.name,
        assigneeId: t.assignee?.id,
        assigneeName: t.assignee?.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Clockify Proxy] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Clockify data' },
      { status: 500 },
    );
  }
}
