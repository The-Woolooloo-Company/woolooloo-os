// Reporting engine — project progress, staff utilization, time/billing
import { getClients, getAllProjects, getClientById } from './clients';
import { getStaff } from './staff';
import { getTasks, getProjects, LinearTask } from './linear';
import { ClockifyTimeEntry, getTimeEntries } from './clockify';
import { getConfig, isLinearConfigured, isClockifyConfigured } from './config-store';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────

export interface ProjectReport {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  linearProjectId?: string;
  clockifyProjectId?: string;
  tasks: { total: number; started: number; completed: number; backlog: number };
  timeTracking: { totalHours: number; billableHours: number; totalAmount: number; billableAmount: number; entries: ClockifyTimeEntry[] };
  progress: number;
}

export interface StaffReport {
  staffId: string;
  name: string;
  role: string;
  email: string;
  linearUserId?: string;
  status: string;
  hourlyRate: number;
  assignments: { total: number; active: number; completed: number };
  timeTracking: { totalHours: number; billableHours: number; totalAmount: number; billableAmount: number };
  utilization: number;
}

export interface ClientReport {
  clientId: string;
  clientName: string;
  color: string;
  projects: ProjectReport[];
  summary: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    billableHours: number;
    totalAmount: number;
    billableAmount: number;
    avgProgress: number;
  };
}

export interface DailyEntry { date: string; hours: number; billable: number; amount: number; }

export interface TimeReport {
  daily: DailyEntry[];
  totalHours: number;
  billableHours: number;
  totalAmount: number;
  billableAmount: number;
  byProject: { projectId: string; projectName: string; hours: number; amount: number }[];
  byStaff: { staffId: string; name: string; hours: number; amount: number }[];
}

// ─── Helpers ───────────────────────────────────────────────────

async function fetchLinearTasks(): Promise<LinearTask[]> {
  if (!isLinearConfigured()) return [];
  try { return await getTasks(); } catch { return []; }
}

async function fetchClockifyEntries(): Promise<ClockifyTimeEntry[]> {
  if (!isClockifyConfigured()) return [];
  try {
    const ws = getConfig().CLOCKIFY_WORKSPACE_ID || '';
    if (!ws) return [];
    return await getTimeEntries({});
  } catch { return []; }
}

// ─── Project Reports ──────────────────────────────────────────

export async function generateProjectReports(params?: { clientId?: string }): Promise<ProjectReport[]> {
  const clientObj = params?.clientId ? getClientById(params.clientId) : null;
  const clients = clientObj ? [clientObj] : getClients();
  const allProjects = clients.flatMap(c => c.projects.map(p => ({ project: p, client: c })));
  const [linearTasks, clockifyEntries] = await Promise.all([fetchLinearTasks(), fetchClockifyEntries()]);

  return allProjects.map(({ project, client }) => {
    const projTasks = linearTasks.filter(t => t.projectId === project.linearProjectId);
    const projEntries = clockifyEntries.filter(e => e.projectId === project.clockifyProjectId);
    const completed = projTasks.filter(t => t.state.type === 'completed').length;
    const started = projTasks.filter(t => t.state.type === 'started').length;
    const backlog = projTasks.filter(t => t.state.type === 'unstarted').length;
    const total = projTasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalHours = projEntries.reduce((s, e) => s + e.duration / 3600, 0);
    const billableHours = projEntries.filter(e => e.billable).reduce((s, e) => s + e.duration / 3600, 0);
    const billableAmount = projEntries.filter(e => e.billable).reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);
    const totalAmount = projEntries.reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);

    return {
      clientId: client.id,
      clientName: client.name,
      projectId: project.id,
      projectName: project.name,
      linearProjectId: project.linearProjectId,
      clockifyProjectId: project.clockifyProjectId,
      tasks: { total, started, completed, backlog },
      timeTracking: { totalHours, billableHours, totalAmount, billableAmount, entries: projEntries },
      progress,
    };
  });
}

// ─── Staff Reports ────────────────────────────────────────────

export async function generateStaffReports(): Promise<StaffReport[]> {
  const staff = getStaff();
  const [linearTasks, clockifyEntries] = await Promise.all([fetchLinearTasks(), fetchClockifyEntries()]);

  return staff.map(member => {
    const assignedTasks = member.linearUserId
      ? linearTasks.filter(t => t.assigneeId === member.linearUserId)
      : [];
    const staffEntries = clockifyEntries.filter(
      e => e.userId === member.id || e.userEmail === member.email
    );
    const completed = assignedTasks.filter(t => t.state.type === 'completed').length;
    const active = assignedTasks.filter(t => t.state.type === 'started').length;
    const totalHours = staffEntries.reduce((s, e) => s + e.duration / 3600, 0);
    const billableHours = staffEntries.filter(e => e.billable).reduce((s, e) => s + e.duration / 3600, 0);
    const totalAmount = staffEntries.reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);
    const billableAmount = staffEntries.filter(e => e.billable).reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);
    const utilization = Math.min(100, Math.round((totalHours / 80) * 100));

    return {
      staffId: member.id,
      name: member.name,
      role: member.role,
      email: member.email,
      linearUserId: member.linearUserId,
      status: member.status,
      hourlyRate: member.hourlyRate || 0,
      assignments: { total: assignedTasks.length, active, completed },
      timeTracking: { totalHours, billableHours, totalAmount, billableAmount },
      utilization,
    };
  });
}

// ─── Client Reports ───────────────────────────────────────────

export async function generateClientReports(): Promise<ClientReport[]> {
  const clients = getClients();
  const reports = await Promise.all(
    clients.map(c => generateProjectReports({ clientId: c.id }))
  );

  return clients.map((client, i) => {
    const pr = reports[i] || [];
    const totalTasks = pr.reduce((s, r) => s + r.tasks.total, 0);
    const avgProgressCalc = pr.length > 0 && totalTasks > 0
      ? Math.round(pr.reduce((s, r) => s + r.progress, 0) / pr.length)
      : 0;
    return {
      clientId: client.id,
      clientName: client.name,
      color: client.color,
      projects: pr,
      summary: {
        totalProjects: pr.length,
        totalTasks,
        completedTasks: pr.reduce((s, r) => s + r.tasks.completed, 0),
        totalHours: pr.reduce((s, r) => s + r.timeTracking.totalHours, 0),
        billableHours: pr.reduce((s, r) => s + r.timeTracking.billableHours, 0),
        totalAmount: pr.reduce((s, r) => s + r.timeTracking.totalAmount, 0),
        billableAmount: pr.reduce((s, r) => s + r.timeTracking.billableAmount, 0),
        avgProgress: avgProgressCalc,
      },
    };
  });
}

// ─── Time Report ──────────────────────────────────────────────

export async function generateTimeReport(): Promise<TimeReport> {
  const entries = await fetchClockifyEntries();
  if (entries.length === 0) {
    return { daily: [], totalHours: 0, billableHours: 0, totalAmount: 0, billableAmount: 0, byProject: [], byStaff: [] };
  }

  const start = startOfMonth(new Date());
  const end = new Date();
  const days = eachDayOfInterval({ start, end });
  const dailyMap = new Map<string, DailyEntry>();
  days.forEach(day => {
    const ds = format(day, 'yyyy-MM-dd');
    dailyMap.set(ds, { date: ds, hours: 0, billable: 0, amount: 0 });
  });

  entries.forEach(entry => {
    const ed = format(parseISO(entry.start), 'yyyy-MM-dd');
    const day = dailyMap.get(ed);
    if (day) {
      const hours = entry.duration / 3600;
      const amt = hours * (entry.billableRate || 0);
      day.hours += hours;
      if (entry.billable) { day.billable += hours; day.amount += amt; }
    }
  });

  const totalHours = entries.reduce((s, e) => s + e.duration / 3600, 0);
  const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + e.duration / 3600, 0);
  const totalAmount = entries.reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);
  const billableAmount = entries.filter(e => e.billable).reduce((s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0);

  const bpMap = new Map<string, { name: string; hours: number; amount: number }>();
  entries.forEach(e => {
    const ex = bpMap.get(e.projectId) || { name: e.projectName, hours: 0, amount: 0 };
    ex.hours += e.duration / 3600;
    ex.amount += (e.duration / 3600) * (e.billableRate || 0);
    bpMap.set(e.projectId, ex);
  });

  const bsMap = new Map<string, { name: string; hours: number; amount: number }>();
  entries.forEach(e => {
    const ex = bsMap.get(e.userId) || { name: e.userName, hours: 0, amount: 0 };
    ex.hours += e.duration / 3600;
    ex.amount += (e.duration / 3600) * (e.billableRate || 0);
    bsMap.set(e.userId, ex);
  });

  return {
    daily: Array.from(dailyMap.values()),
    totalHours,
    billableHours,
    totalAmount,
    billableAmount,
    byProject: Array.from(bpMap.entries()).map(([id, d]) => ({
      projectId: id, projectName: d.name, hours: d.hours, amount: d.amount,
    })),
    byStaff: Array.from(bsMap.entries()).map(([id, d]) => ({
      staffId: id, name: d.name, hours: d.hours, amount: d.amount,
    })),
  };
}

// ─── Quick Stats (Dashboard) ─────────────────────────────────

export interface QuickStats {
  totalClients: number;
  totalProjects: number;
  totalTasks: number;
  tasksInProgress: number;
  tasksCompleted: number;
  totalStaff: number;
  staffActive: number;
  totalHours: number;
  billableHours: number;
  totalRevenue: number;
  avgProjectProgress: number;
  agentDispatches: number;
}

export async function getQuickStats(): Promise<QuickStats> {
  const clients = getClients();
  const staff = getStaff();
  const allProjects = getAllProjects();
  const [linearTasks, clockifyEntries] = await Promise.all([
    fetchLinearTasks(),
    fetchClockifyEntries(),
  ]);

  const tasksInProgress = linearTasks.filter(t => t.state.type === 'started').length;
  const tasksCompleted = linearTasks.filter(t => t.state.type === 'completed').length;
  const totalHours = clockifyEntries.reduce((s, e) => s + e.duration / 3600, 0);
  const billableHours = clockifyEntries.filter(e => e.billable).reduce((s, e) => s + e.duration / 3600, 0);
  const totalRevenue = clockifyEntries.filter(e => e.billable).reduce(
    (s, e) => s + (e.duration / 3600) * (e.billableRate || 0), 0
  );
  const avgProgress =
    linearTasks.length > 0 ? Math.round((tasksCompleted / linearTasks.length) * 100) : 0;

  let agentDispatches = 0;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('woolooloo-agent-dispatches');
      if (raw) agentDispatches = JSON.parse(raw).length;
    }
  } catch { /* ignore */ }

  return {
    totalClients: clients.length,
    totalProjects: allProjects.length,
    totalTasks: linearTasks.length,
    tasksInProgress,
    tasksCompleted,
    totalStaff: staff.length,
    staffActive: staff.filter(s => s.status === 'active').length,
    totalHours,
    billableHours,
    totalRevenue,
    avgProjectProgress: avgProgress,
    agentDispatches,
  };
}
