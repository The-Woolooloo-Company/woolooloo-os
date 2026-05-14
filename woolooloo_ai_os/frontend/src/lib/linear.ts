// Linear API integration
import { getConfig } from './config-store';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

function getLinearKey(): string | undefined {
  return getConfig().LINEAR_API_KEY;
}

export interface LinearProject {
  id: string;
  title: string;
  key: string;
  description?: string;
  color: string;
  teamId: string;
  teamName: string;
}

export interface LinearState {
  id: string;
  name: string;
  type: 'unstarted' | 'started' | 'completed';
}

export interface LinearTask {
  id: string;
  title: string;
  description?: string;
  state: LinearState;
  priority: 0 | 1 | 2 | 3;
  projectId: string;
  projectTitle: string;
  projectKey: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  projectId: string;
  priority: 0 | 1 | 2 | 3;
  assigneeId?: string;
}

export interface LinearUser {
  id: string;
  name: string;
  avatarUrl: string;
}

// ─── GraphQL helpers ─────────────────────────────────────────────────────────

async function linearQuery(query: string, variables?: Record<string, unknown>): Promise<any> {
  const apiKey = getLinearKey();
  if (!apiKey) {
    throw new Error('Linear not configured. Please set LINEAR_API_KEY in Config page.');
  }

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Linear API key is used directly, NOT with "Bearer" prefix
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`Linear GraphQL error: ${data.errors[0].message}`);
  }

  return data.data;
}

function mapProject(node: any): LinearProject {
  const teamNode = node.teams?.nodes?.[0] || node.team || null;
  return {
    id: node.id,
    title: node.name || node.title || node.id,
    key: (node.identifier || node.id.replace(/-/g, '').toUpperCase().substring(0, 6)),
    description: node.description,
    color: node.color || '#888888',
    teamId: teamNode?.id || '',
    teamName: teamNode?.name || '',
  };
}

function mapIssue(issue: any): LinearTask {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    state: issue.state
      ? { id: issue.state.id, name: issue.state.name, type: mapStateType(issue.state.type) }
      : { id: '', name: 'Unknown', type: 'unstarted' },
    priority: issue.priority ?? 0,
    projectId: issue.project?.id || '',
    projectTitle: issue.project?.name || 'Unknown',
    projectKey: issue.identifier || '',
    assigneeId: issue.assignee?.id,
    assigneeName: issue.assignee?.name,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

// Map Linear state.type strings to our simplified types
function mapStateType(rawType: string): 'unstarted' | 'started' | 'completed' {
  if (['DONE', 'completed'].includes(rawType?.toUpperCase())) return 'completed';
  if (['NEW', 'unstarted', 'BACKLOG', 'backlog', 'CANCELLED', 'cancelled'].includes(rawType?.toUpperCase())) return 'unstarted';
  return 'started';
}

// ─── API queries ─────────────────────────────────────────────────────────────

export async function getProjects(): Promise<LinearProject[]> {
  const query = `
    query {
      projects(first: 100) {
        nodes {
          id
          name
          description
          color
          teams {
            nodes {
              id
              name
            }
          }
          lead {
            id
            name
          }
        }
      }
    }
  `;

  const data = await linearQuery(query);
  return data.projects.nodes.map(mapProject);
}

export async function getTasks(filters?: {
  projectId?: string;
  status?: string[];
  priority?: number[];
  assigneeId?: string;
}): Promise<LinearTask[]> {
  const query = `
    query GetTasks($filter: IssueFilter) {
      issues(filter: $filter, first: 200) {
        nodes {
          id
          title
          description
          identifier
          state {
            id
            name
            type
          }
          priority
          project {
            id
            name
          }
          assignee {
            id
            name
          }
          createdAt
          updatedAt
        }
      }
    }
  `;

  // Map local filter names to actual Linear state types
  const stateTypeMap: Record<string, string> = {
    unstarted: 'NEW',
    started: 'IN_PROGRESS',
    completed: 'DONE',
    backlog: 'BACKLOG',
  };

  const variables = filters
    ? {
        filter: {
          ...(filters.projectId && { projectId: filters.projectId }),
          ...(filters.status && {
            state: { type: { in: filters.status.map((s) => stateTypeMap[s] || s) } },
          }),
          ...(filters.priority && { priority: filters.priority }),
          ...(filters.assigneeId && { assignee: { id: { eq: filters.assigneeId } } }),
        },
      }
    : undefined;

  const data = await linearQuery(query, variables);
  return data.issues.nodes.map(mapIssue);
}

export async function createTask(input: TaskInput): Promise<LinearTask> {
  const query = `
    mutation CreateIssue($input: CreateIssueInput!) {
      createIssue(input: $input) {
        success
        issue {
          id
          title
          description
          identifier
          state {
            id
            name
            type
          }
          priority
          project {
            id
            name
          }
          assignee {
            id
            name
          }
          createdAt
          updatedAt
        }
      }
    }
  `;

  const variables = {
    input: {
      title: input.title,
      ...(input.description && { description: input.description }),
      projectId: input.projectId,
      priority: input.priority,
      ...(input.assigneeId && { assigneeId: input.assigneeId }),
    },
  };

  const data = await linearQuery(query, variables);

  if (!data.createIssue.success) {
    throw new Error('Failed to create task in Linear');
  }

  return mapIssue(data.createIssue.issue);
}

export async function getLinearUsers(): Promise<LinearUser[]> {
  const query = `
    query {
      viewer {
        id
        name
        email
        avatarUrl
      }
      teams {
        nodes {
          id
          name
          members {
            nodes {
              id
              name
              avatarUrl
            }
          }
        }
      }
    }
  `;

  const data = await linearQuery(query);
  const seen = new Set<string>();
  const result: LinearUser[] = [];

  const addIfNew = (u: any) => {
    if (u && !seen.has(u.id)) {
      seen.add(u.id);
      result.push({ id: u.id, name: u.name, avatarUrl: u.avatarUrl || '' });
    }
  };

  // Add current viewer
  addIfNew(data.viewer);

  // Add team members
  data.teams?.nodes?.forEach((team: any) => {
    team.members?.nodes?.forEach(addIfNew);
  });

  return result;
}

export async function updateTask(
  issueId: string,
  input: { title?: string; description?: string; priority?: 0 | 1 | 2 | 3; stateId?: string }
): Promise<LinearTask> {
  const query = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      updateIssue(id: $id, input: $input) {
        success
        issue {
          id
          title
          description
          identifier
          state {
            id
            name
            type
          }
          priority
          project {
            id
            name
          }
          assignee {
            id
            name
          }
          createdAt
          updatedAt
        }
      }
    }
  `;

  const variables = {
    id: issueId,
    input: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.stateId !== undefined && { stateId: input.stateId }),
    },
  };

  const data = await linearQuery(query, variables);
  if (!data.updateIssue.success) {
    throw new Error('Failed to update task in Linear');
  }
  return mapIssue(data.updateIssue.issue);
}

export async function deleteTask(issueId: string): Promise<boolean> {
  const query = `
    mutation DeleteIssue($id: String!) {
      deleteIssue(id: $id) {
        success
      }
    }
  `;

  const data = await linearQuery(query, { id: issueId });
  return data.deleteIssue.success;
}

export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    0: 'None',
    1: 'Low',
    2: 'Medium',
    3: 'Urgent',
  };
  return labels[priority] || 'None';
}

export function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    0: 'bg-gray-100 text-gray-800',
    1: 'bg-blue-100 text-blue-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-red-100 text-red-800',
  };
  return colors[priority] || colors[0];
}

export function getStatusColor(state: string): string {
  const colors: Record<string, string> = {
    unstarted: 'bg-gray-100 text-gray-800',
    started: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };
  return colors[state] || colors.unstarted;
}

// ─── Local Storage Mock Data ─────────────────────────────────────────────────

const LOCAL_TASKS_KEY = 'woolooloo-local-tasks';

export interface LocalTask extends LinearTask {
  source: 'local';
}

function now() {
  return new Date().toISOString();
}

function uuid() {
  return 'local-' + Math.random().toString(36).substring(2, 10);
}

function readLocalTasks(): LocalTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalTasks(tasks: LocalTask[]): void {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

export function seedMockTasks(): void {
  const existing = readLocalTasks();
  if (existing.length > 0) return;

  const baseDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = now();

  const mockTasks: LocalTask[] = [
    {
      id: uuid(),
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment to staging and production environments.',
      source: 'local',
      state: { id: 'local-1', name: 'In Progress', type: 'started' },
      priority: 3,
      projectId: 'local-project-1',
      projectTitle: 'Woolooloo Core',
      projectKey: 'WOOL',
      assigneeId: 'local-user-1',
      assigneeName: 'Alex Chen',
      createdAt: baseDate,
      updatedAt: today,
    },
    {
      id: uuid(),
      title: 'Design onboarding flow',
      description: 'Create wireframes for new user onboarding experience.',
      source: 'local',
      state: { id: 'local-2', name: 'Backlog', type: 'unstarted' },
      priority: 2,
      projectId: 'local-project-1',
      projectTitle: 'Woolooloo Core',
      projectKey: 'WOOL',
      assigneeId: 'local-user-2',
      assigneeName: 'Sarah Kim',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: uuid(),
      title: 'Fix login bug for SSO users',
      description: 'SSO users get redirected to 404 after auth. Fix redirect URL handling.',
      source: 'local',
      state: { id: 'local-1', name: 'In Progress', type: 'started' },
      priority: 3,
      projectId: 'local-project-1',
      projectTitle: 'Woolooloo Core',
      projectKey: 'WOOL',
      assigneeId: 'local-user-3',
      assigneeName: 'James Wright',
      createdAt: baseDate,
      updatedAt: today,
    },
    {
      id: uuid(),
      title: 'Build analytics dashboard',
      description: 'Implement dashboard with charts for task completion and velocity.',
      source: 'local',
      state: { id: 'local-2', name: 'Backlog', type: 'unstarted' },
      priority: 2,
      projectId: 'local-project-2',
      projectTitle: 'Dashboard',
      projectKey: 'DASH',
      assigneeId: 'local-user-2',
      assigneeName: 'Sarah Kim',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: uuid(),
      title: 'Migrate database to PostgreSQL 16',
      description: 'Upgrade DB for improved JSONB support and query performance.',
      source: 'local',
      state: { id: 'local-3', name: 'Completed', type: 'completed' },
      priority: 1,
      projectId: 'local-project-1',
      projectTitle: 'Woolooloo Core',
      projectKey: 'WOOL',
      assigneeId: 'local-user-3',
      assigneeName: 'James Wright',
      createdAt: baseDate,
      updatedAt: today,
    },
    {
      id: uuid(),
      title: 'Add real-time notifications',
      description: 'WebSocket push notifications for task assignments and comments.',
      source: 'local',
      state: { id: 'local-2', name: 'Backlog', type: 'unstarted' },
      priority: 2,
      projectId: 'local-project-2',
      projectTitle: 'Dashboard',
      projectKey: 'DASH',
      assigneeId: 'local-user-1',
      assigneeName: 'Alex Chen',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: uuid(),
      title: 'Write API documentation',
      description: 'Document all REST endpoints with examples and auth requirements.',
      source: 'local',
      state: { id: 'local-1', name: 'In Progress', type: 'started' },
      priority: 1,
      projectId: 'local-project-2',
      projectTitle: 'Dashboard',
      projectKey: 'DASH',
      assigneeId: 'local-user-4',
      assigneeName: 'Mia Patel',
      createdAt: baseDate,
      updatedAt: today,
    },
    {
      id: uuid(),
      title: 'Optimize image uploads',
      description: 'Compress, resize, and add CDN for faster delivery.',
      source: 'local',
      state: { id: 'local-3', name: 'Completed', type: 'completed' },
      priority: 1,
      projectId: 'local-project-1',
      projectTitle: 'Woolooloo Core',
      projectKey: 'WOOL',
      assigneeId: 'local-user-4',
      assigneeName: 'Mia Patel',
      createdAt: baseDate,
      updatedAt: today,
    },
  ];

  writeLocalTasks(mockTasks);
}

export function getLocalTasks(): LocalTask[] {
  return readLocalTasks();
}

export function addLocalTask(
  task: Omit<LocalTask, 'id' | 'createdAt' | 'updatedAt'>
): LocalTask {
  const timestamp = now();
  const newTask: LocalTask = {
    ...task,
    id: uuid(),
    source: 'local',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const tasks = readLocalTasks();
  tasks.push(newTask);
  writeLocalTasks(tasks);
  return newTask;
}

export function updateLocalTask(
  id: string,
  updates: Partial<Omit<LocalTask, 'id' | 'source'>>
): LocalTask | null {
  const tasks = readLocalTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: now() };
  writeLocalTasks(tasks);
  return tasks[idx];
}

export function deleteLocalTask(id: string): boolean {
  const tasks = readLocalTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  writeLocalTasks(filtered);
  return true;
}

export function tryGetLocalTasks(): {
  projects: LinearProject[];
  tasks: LinearTask[];
  users: LinearUser[];
} {
  if (getLinearKey()) {
    return { projects: [], tasks: [], users: [] };
  }

  seedMockTasks();
  const localTasks = getLocalTasks();

  const projects: LinearProject[] = [];
  const projectMap = new Map<string, LinearProject>();
  for (const t of localTasks) {
    if (!projectMap.has(t.projectId)) {
      const project: LinearProject = {
        id: t.projectId,
        title: t.projectTitle,
        key: t.projectKey,
        color: t.projectKey === 'WOOL' ? '#6366f1' : '#0ea5e9',
        teamId: 'local-team-1',
        teamName: 'Engineering',
      };
      projectMap.set(t.projectId, project);
      projects.push(project);
    }
  }

  const users: LinearUser[] = [];
  const userMap = new Map<string, LinearUser>();
  for (const t of localTasks) {
    if (t.assigneeId && !userMap.has(t.assigneeId)) {
      const user: LinearUser = {
        id: t.assigneeId,
        name: t.assigneeName ?? 'Unassigned',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.assigneeName ?? '?')}`,
      };
      userMap.set(t.assigneeId, user);
      users.push(user);
    }
  }

  return {
    projects,
    tasks: localTasks as LinearTask[],
    users,
  };
}
