// Clockify time-tracking integration for Woolooloo OS
import { getConfig } from './config-store';

const CLOCKIFY_API_URL = 'https://api.clockify.me/api/v1';

function getClockifyKey(): string | undefined {
  return getConfig().CLOCKIFY_API_KEY;
}

const _workspaceCache: { value?: string; pending?: Promise<string | undefined>; apiKey?: string } = {};

async function resolveWorkspaceId(): Promise<string | undefined> {
  const currentKey = getClockifyKey();
  if (_workspaceCache.apiKey !== currentKey) {
    _workspaceCache.value = undefined;
    _workspaceCache.pending = undefined;
    _workspaceCache.apiKey = currentKey;
  }
  if (_workspaceCache.value) return _workspaceCache.value;

  // Try env var / localStorage first - strip quotes if present
  const stored = getConfig().CLOCKIFY_WORKSPACE_ID;
  if (stored) {
    const cleaned = stored.replace(/["']/g, '');
    if (cleaned.length === 24 && /^[0-9a-f]+$/.test(cleaned)) {
      _workspaceCache.value = cleaned;
      return cleaned;
    }
  }

  if (_workspaceCache.pending) return _workspaceCache.pending;
  _workspaceCache.pending = (async () => {
    try {
      const apiKey = getClockifyKey();
      if (!apiKey) return undefined;
      const res = await fetch(`${CLOCKIFY_API_URL}/user`, { headers: { 'x-api-key': apiKey } });
      if (res.ok) {
        const data = await res.json();
        const ws = data.activeWorkspace || data.defaultWorkspace || data.workspace;
        if (ws) {
          _workspaceCache.value = ws;
          return ws;
        }
      }
    } catch { /* ignore */ }
    return undefined;
  })();
  return _workspaceCache.pending;
}

// --- Types ---

export interface LinearMatchedTask {
  id: string;
  title: string;
  identifier: string;
  state: { id: string; name: string; type: 'unstarted' | 'started' | 'completed' };
  priority: number;
  score: number;
}

export interface ClockifyTimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userEmail: string;
  description: string;
  start: string;
  end: string | null;
  duration: number;          // seconds
  billable: boolean;
  billableRate: number;      // hourly rate in workspace currency
  billableAmount: number;    // calculated: hours * rate
  matchedLinearTask?: LinearMatchedTask;
}

export interface ClockifyUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  billableRate: number;
  membershipStatus: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  workspaceId: string;
  clientName: string;
}

export interface ClockifyClient {
  id: string;
  name: string;
  workspaceId: string;
}

// --- API Functions ---

export async function getUsers(): Promise<ClockifyUser[]> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return [];
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');

  // /workspaces/{ws}/users returns array of user objects (id = userId)
  const res = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/users`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error('Failed to fetch workspace users');
  const users = await res.json();
  if (!Array.isArray(users)) return [];

  return users.map((u: any) => ({
    id: u.id,
    userId: u.id,
    userName: u.name || u.email?.split('@')[0] || 'Unknown',
    userEmail: u.email || '',
    billableRate: u.hourlyRate?.amount || 0,
    membershipStatus: u.status || 'UNKNOWN',
  }));
}

export async function getProjects(): Promise<ClockifyProject[]> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) throw new Error('Clockify not configured');
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');

  const res = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/projects`, {
    headers: { 'x-api-key': apiKey!, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((p: any) => ({
    id: p.id,
    name: p.name,
    workspaceId: p.workspaceId,
    clientName: p.clientName || '',
  }));
}

export async function getClients(): Promise<ClockifyClient[]> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) throw new Error('Clockify not configured');
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');

  const res = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/clients`, {
    headers: { 'x-api-key': apiKey!, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch clients');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((c: any) => ({
    id: c.id,
    name: c.name,
    workspaceId: c.workspaceId,
  }));
}

/**
 * Fetch time entries for all active users in the workspace.
 * Uses GET /workspaces/{ws}/user/{userId}/time-entries with pagination.
 */
export async function getTimeEntries(params: {
  userIds?: string[];
  projectIds?: string[];
  start?: string;
  end?: string;
}): Promise<ClockifyTimeEntry[]> {
  const workspaceId = await resolveWorkspaceId();
  const apiKey = getClockifyKey();
  if (!workspaceId || !apiKey) return [];

  // Fetch users and projects for name resolution
  let allUsers: ClockifyUser[];
  let allProjects: ClockifyProject[];
  try {
    [allUsers, allProjects] = await Promise.all([getUsers(), getProjects()]);
  } catch {
    allUsers = [];
    allProjects = [];
  }

  // Build lookup maps
  const userMap = new Map<string, { name: string; email: string; rate: number }>();
  for (const u of allUsers) {
    userMap.set(u.id, { name: u.userName, email: u.userEmail, rate: u.billableRate });
  }
  const projectMap = new Map<string, string>();
  for (const p of allProjects) {
    projectMap.set(p.id, p.name);
  }

  // Determine which users to fetch (all active by default)
  const targetUserIds = params.userIds || allUsers
    .filter(u => u.membershipStatus === 'ACTIVE')
    .map(u => u.id);

  // Fetch entries for each user, paginating as needed
  const allEntries: ClockifyTimeEntry[] = [];

  for (const userId of targetUserIds) {
    let page = 1;
    const pageSize = 200; // max
    while (true) {
      const url = new URL(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/user/${userId}/time-entries`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('page-size', String(pageSize));
      if (params.start) url.searchParams.set('dateFrom', params.start);
      if (params.end) url.searchParams.set('dateTo', params.end);

      const res = await fetch(url.toString(), { headers: { 'x-api-key': apiKey } });
      if (!res.ok) break;

      const entries: any[] = await res.json();
      if (!entries.length) break;

      for (const raw of entries) {
        const ti = raw.timeInterval || {};
        const dur = parseDuration(ti.duration);
        if (dur <= 0) continue; // skip entries with no duration

        const projectId = raw.projectId || '';
        const projectName = projectMap.get(projectId) || raw.project?.name || 'No project';
        const userInfo = userMap.get(raw.userId) || { name: 'Unknown', email: '', rate: 0 };
        // Use entry-level hourly rate if available, otherwise fall back to user's workspace rate
        const entryRate = raw.hourlyRate?.amount || userInfo.rate;
        const billableAmount = raw.billable ? (dur / 3600) * entryRate : 0;

        allEntries.push({
          id: raw.id || '',
          projectId,
          projectName,
          userId: raw.userId || '',
          userName: userInfo.name,
          userEmail: userInfo.email,
          description: raw.description || '',
          start: ti.start || '',
          end: ti.end || null,
          duration: dur,
          billable: raw.billable || false,
          billableRate: userInfo.rate,
          billableAmount,
        });
      }

      // If we got fewer than pageSize, we're on the last page
      if (entries.length < pageSize) break;
      page++;

      // Safety: cap at 10 pages per user to avoid infinite loops
      if (page > 10) break;
    }
  }

  // Apply client-side filters
  let result = allEntries;
  if (params.projectIds && params.projectIds.length > 0) {
    const projSet = new Set(params.projectIds);
    result = result.filter(e => projSet.has(e.projectId));
  }
  if (params.start) {
    result = result.filter(e => e.start >= params.start!);
  }
  if (params.end) {
    result = result.filter(e => e.start <= params.end!);
  }

  // Sort by start date descending (most recent first)
  result.sort((a, b) => b.start.localeCompare(a.start));

  return result;
}

export async function createTimeEntry(input: {
  projectId?: string;
  description: string;
  start: string;
  end?: string;
  userId: string;
  workspaceId: string;
}): Promise<ClockifyTimeEntry> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) throw new Error('Clockify not configured');
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');

  const res = await fetch(`${CLOCKIFY_API_URL}/workspaces/${workspaceId}/time-entries`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create time entry: ${res.statusText}`);
  const data = await res.json();
  return {
    id: data.id,
    projectId: data.projectId || '',
    projectName: data.projectName || 'No project',
    userId: data.userId || '',
    userName: 'Unknown',
    userEmail: '',
    description: data.description || '',
    start: data.timeInterval?.start || data.start,
    end: data.timeInterval?.end || data.end,
    duration: data.timeInterval?.duration ? parseDuration(data.timeInterval.duration) : 0,
    billable: data.billable || false,
    billableRate: data.hourlyRate?.amount || 0,
    billableAmount: 0,
  };
}

export async function updateTimeEntry(entryId: string, input: Record<string, unknown>): Promise<ClockifyTimeEntry> {
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');
  const res = await fetch(`${CLOCKIFY_API_URL}/time-entry/${entryId}`, {
    method: 'PUT',
    headers: { 'x-api-key': apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update time entry: ${res.statusText}`);
  const data = await res.json();
  return {
    id: data.id,
    projectId: data.projectId || '',
    projectName: data.projectName || 'No project',
    userId: data.userId || '',
    userName: 'Unknown',
    userEmail: '',
    description: data.description || '',
    start: data.timeInterval?.start || data.start,
    end: data.timeInterval?.end || data.end,
    duration: data.timeInterval?.duration ? parseDuration(data.timeInterval.duration) : 0,
    billable: data.billable || false,
    billableRate: data.hourlyRate?.amount || 0,
    billableAmount: 0,
  };
}

export async function deleteTimeEntry(entryId: string): Promise<boolean> {
  const apiKey = getClockifyKey();
  if (!apiKey) throw new Error('Clockify not configured');
  const res = await fetch(`${CLOCKIFY_API_URL}/time-entry/${entryId}`, {
    method: 'DELETE',
    headers: { 'x-api-key': apiKey! },
  });
  return res.ok;
}

// --- Helpers ---

/**
 * Parse ISO 8601 duration (PT2H34M, PT48S, PT3H55M, PT1H33M13S) to seconds.
 */
function parseDuration(isoDur: string | undefined | null): number {
  if (!isoDur) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoDur);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const mi = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + mi * 60 + s;
}

export function parseLinearTaskId(description: string): string | null {
  const match = description.match(/LIN-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

export function exportTimeEntriesToCSV(entries: ClockifyTimeEntry[]): string {
  const headers = ['Date', 'User', 'Email', 'Project', 'Description', 'Start', 'End', 'Duration (h)', 'Billable', 'Rate', 'Amount'];
  const rows = entries.map(e => [
    new Date(e.start).toLocaleDateString(),
    e.userName,
    e.userEmail,
    e.projectName,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    new Date(e.start).toLocaleTimeString(),
    e.end ? new Date(e.end).toLocaleTimeString() : '-',
    (e.duration / 3600).toFixed(2),
    e.billable ? 'Yes' : 'No',
    e.billableRate.toFixed(2),
    e.billableAmount.toFixed(2),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function isClockifyConfigured(): boolean {
  return !!getClockifyKey();
}
