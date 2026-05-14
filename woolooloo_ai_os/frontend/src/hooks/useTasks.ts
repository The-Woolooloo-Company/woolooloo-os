'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LinearProject,
  LinearTask,
  TaskInput,
  getProjects,
  getTasks,
  createTask,
  getLinearUsers,
  LinearUser,
  tryGetLocalTasks,
  seedMockTasks,
  getLocalTasks,
  addLocalTask,
} from '@/lib/linear';
import { getConfig } from '@/lib/config-store';
import { Client, getClients, getProjectsByClient, seedMockClients, getClientLinearProjectIds } from '@/lib/clients';

interface TaskFilters {
  status: string[];
  priority: number[];
  assigneeId: string | null;
}

interface UseTasksReturn {
  projects: LinearProject[];
  tasks: LinearTask[];
  users: LinearUser[];
  clients: Client[];
  selectedClientId: string | null;
  selectedProjectId: string | null;
  filters: TaskFilters;
  loading: boolean;
  error: string | null;
  selectedTask: LinearTask | null;
  isLinearConfigured: boolean;
  setSelectedClientId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  setSelectedTask: (task: LinearTask | null) => void;
  createTask: (input: TaskInput) => Promise<LinearTask>;
  createLocalTask: (input: TaskInput) => void;
  syncProjects: () => Promise<void>;
  reloadLocalTasks: () => void;
}

export function useTasks(): UseTasksReturn {
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [tasks, setTasks] = useState<LinearTask[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>({
    status: [],
    priority: [],
    assigneeId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<LinearTask | null>(null);
  const [isLinearConfigured, setIsLinearConfigured] = useState(false);

  const setFilters = (newFilters: Partial<TaskFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const fetchClients = useCallback(async () => {
    seedMockClients();
    setClients(getClients());
  }, []);

  const fetchLinear = useCallback(async () => {
    try {
      const [projectsData, tasksData, usersData] = await Promise.all([
        getProjects(),
        getTasks(),
        getLinearUsers(),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
      setUsers(usersData);
      setIsLinearConfigured(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch from Linear';
      if (!message.includes('not configured')) {
        setError(message);
      }
      // Fall back to local tasks
      const local = tryGetLocalTasks();
      setProjects(local.projects);
      setTasks(local.tasks);
      setUsers(local.users);
      setIsLinearConfigured(!!getConfig().LINEAR_API_KEY);
    }
  }, []);

  const fetchClientsAndTasks = useCallback(async () => {
    setLoading(true);
    await fetchClients();
    await fetchLinear();
    setLoading(false);
  }, [fetchClients, fetchLinear]);

  const createTaskHandler = async (input: TaskInput): Promise<LinearTask> => {
    try {
      const task = await createTask(input);
      const tasksData = await getTasks();
      setTasks(tasksData);
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
      throw err;
    }
  };

  const createLocalTask = (input: TaskInput) => {
    addLocalTask({
      source: 'local',
      title: input.title,
      description: input.description,
      state: { id: 'local-unstarted', name: 'Backlog', type: 'unstarted' },
      priority: input.priority,
      projectId: input.projectId,
      projectTitle: projects.find(p => p.id === input.projectId)?.title || 'Unknown',
      projectKey: projects.find(p => p.id === input.projectId)?.key || 'UNK',
      assigneeId: input.assigneeId,
      assigneeName: users.find(u => u.id === input.assigneeId)?.name,
    });
    setTasks(getLocalTasks());
  };

  const reloadLocalTasks = () => {
    seedMockTasks();
    const local = tryGetLocalTasks();
    setProjects(local.projects);
    setTasks(local.tasks);
    setUsers(local.users);
  };

  const syncProjects = async () => {
    await fetchLinear();
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await fetchClients();
      seedMockTasks();
      try {
        const [projectsData, tasksData, usersData] = await Promise.all([
          getProjects(),
          getTasks(),
          getLinearUsers(),
        ]);
        if (!cancelled) {
          setProjects(projectsData);
          setTasks(tasksData);
          setUsers(usersData);
          setIsLinearConfigured(true);
          setLoading(false);
        }
      } catch {
        if (cancelled) return;
        const local = tryGetLocalTasks();
        setProjects(local.projects);
        setTasks(local.tasks);
        setUsers(local.users);
        setIsLinearConfigured(false);
        setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      setSelectedProjectId(null);
    }
  }, [selectedClientId]);

  return {
    projects,
    tasks,
    users,
    clients,
    selectedClientId,
    selectedProjectId,
    filters,
    loading,
    error,
    selectedTask,
    isLinearConfigured,
    setSelectedClientId,
    setSelectedProjectId,
    setFilters,
    setSelectedTask,
    createTask: createTaskHandler,
    createLocalTask,
    syncProjects,
    reloadLocalTasks,
  };
}
