const LOCAL_TASKS_KEY = 'woolooloo-local-tasks';

import type { LinearTask } from './linear';

export interface LocalTask {
  id: string;
  clientId: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'unstarted' | 'started' | 'completed';
  priority: 0 | 1 | 2 | 3;
  assigneeName?: string;
  linearTaskId?: string;
  linearProjectId?: string;
  syncedToLinear: boolean;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function getLocalTasks(): LocalTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LOCAL_TASKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveLocalTasks(tasks: LocalTask[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

export function addLocalTask(task: Omit<LocalTask, 'id' | 'createdAt' | 'updatedAt'>): LocalTask {
  const tasks = getLocalTasks();
  const now = new Date().toISOString();
  const newTask: LocalTask = { ...task, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  tasks.push(newTask);
  saveLocalTasks(tasks);
  return newTask;
}

export function updateLocalTask(id: string, updates: Partial<LocalTask>): LocalTask | null {
  const tasks = getLocalTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  saveLocalTasks(tasks);
  return tasks[idx];
}

export function deleteLocalTask(id: string): boolean {
  const tasks = getLocalTasks().filter(t => t.id !== id);
  saveLocalTasks(tasks);
  return true;
}

export function getTasksByClient(clientId: string): LocalTask[] {
  return getLocalTasks().filter(t => t.clientId === clientId);
}

export function getTasksByProject(projectId: string): LocalTask[] {
  return getLocalTasks().filter(t => t.projectId === projectId);
}

// Merge local tasks with Linear tasks for a unified view
export function mergeWithLinearTasks(localTasks: LocalTask[], linearTasks: LinearTask[]): (LocalTask | LinearTask)[] {
  const localIds = new Set(localTasks.map(l => l.linearTaskId));
  const syncedFromLinear = linearTasks.filter(l => !localIds.has(l.id));
  return [...localTasks, ...syncedFromLinear];
}
