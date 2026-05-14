'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LinearProject,
  LinearTask,
  getProjects as getLinearProjects,
  getTasks as getLinearTasks,
} from '@/lib/linear';
import {
  ClockifyProject,
  ClockifyTimeEntry,
  getProjects as getClockifyProjects,
  getTimeEntries as getClockifyTimeEntries,
} from '@/lib/clockify';
import { getConfig } from '@/lib/config-store';
import {
  Client,
  getClientById,
  getClientLinearProjectIds,
  getClientClockifyProjectIds,
} from '@/lib/clients';
import { startOfMonth, format } from 'date-fns';

interface UseClientDataReturn {
  client: Client | null;
  linearProjects: LinearProject[];
  clockifyProjects: ClockifyProject[];
  allTasks: LinearTask[];
  clientTasks: LinearTask[];
  allEntries: ClockifyTimeEntry[];
  clientEntries: ClockifyTimeEntry[];
  loading: boolean;
  error: string | null;
  isLinearConfigured: boolean;
  isClockifyConfigured: boolean;
  totalHours: number;
  totalBillable: number;
  refresh: () => Promise<void>;
}

export function useClientData(clientId: string | string[] | undefined, dateRange?: { start: Date; end: Date }): UseClientDataReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [clockifyProjects, setClockifyProjects] = useState<ClockifyProject[]>([]);
  const [allTasks, setAllTasks] = useState<LinearTask[]>([]);
  const [allEntries, setAllEntries] = useState<ClockifyTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLinearConfigured = !!getConfig().LINEAR_API_KEY;
  const isClockifyConfigured = !!getConfig().CLOCKIFY_API_KEY;

  const id = typeof clientId === 'string' ? clientId : undefined;

  const clientLinearIds = useMemo(() => id ? getClientLinearProjectIds(id) : [], [id]);
  const clientClockifyIds = useMemo(() => id ? getClientClockifyProjectIds(id) : [], [id]);

  const clientTasks = useMemo(() => {
    if (!clientLinearIds.length) return allTasks;
    return allTasks.filter(t => clientLinearIds.includes(t.projectId));
  }, [allTasks, clientLinearIds]);

  const clientEntries = useMemo(() => {
    if (!clientClockifyIds.length) return allEntries;
    return allEntries.filter(e => clientClockifyIds.includes(e.projectId));
  }, [allEntries, clientClockifyIds]);

  const totalHours = useMemo(() => clientEntries.reduce((sum, e) => sum + e.duration / 3600, 0), [clientEntries]);
  const totalBillable = useMemo(() => clientEntries.reduce((sum, e) => {
    if (!e.billable) return sum;
    return sum + (e.duration / 3600) * e.billableRate;
  }, 0), [clientEntries]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const c = getClientById(id);
    setClient(c || null);

    const results: {
      linear?: LinearProject[];
      tasks?: LinearTask[];
      clockify?: ClockifyProject[];
      entries?: ClockifyTimeEntry[];
    } = {};
    const errors: string[] = [];

    if (isLinearConfigured) {
      try {
        const [projs, tasks] = await Promise.all([getLinearProjects(), getLinearTasks()]);
        results.linear = projs;
        results.tasks = tasks;
      } catch (e) {
        errors.push('Failed to fetch Linear data');
      }
    }

    if (isClockifyConfigured) {
      try {
        const [projs, entries] = await Promise.all([
          getClockifyProjects(),
          getClockifyTimeEntries({

            start: format(dateRange?.start || startOfMonth(new Date()), 'yyyy-MM-dd'),
            end: format(dateRange?.end || new Date(), 'yyyy-MM-dd'),
          }),
        ]);
        results.clockify = projs;
        results.entries = entries;
      } catch (e) {
        errors.push('Failed to fetch Clockify data');
      }
    }

    setLinearProjects(results.linear || []);
    setAllTasks(results.tasks || []);
    setClockifyProjects(results.clockify || []);
    setAllEntries(results.entries || []);
    setLoading(false);

    if (errors.length) setError(errors.join(', '));
  }, [id, isLinearConfigured, isClockifyConfigured, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    client,
    linearProjects,
    clockifyProjects,
    allTasks,
    clientTasks,
    allEntries,
    clientEntries,
    loading,
    error,
    isLinearConfigured,
    isClockifyConfigured,
    totalHours,
    totalBillable,
    refresh: fetchData,
  };
}

// Simpler hook for just fetching external project lists (used in client detail mapping dropdowns)
export function useExternalProjects() {
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [clockifyProjects, setClockifyProjects] = useState<ClockifyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLinearConfigured = !!getConfig().LINEAR_API_KEY;
  const isClockifyConfigured = !!getConfig().CLOCKIFY_API_KEY;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    const errors: string[] = [];

    if (isLinearConfigured) {
      try {
        setLinearProjects(await getLinearProjects());
      } catch {
        errors.push('Linear fetch failed');
      }
    }

    if (isClockifyConfigured) {
      try {
        setClockifyProjects(await getClockifyProjects());
      } catch {
        errors.push('Clockify fetch failed');
      }
    }

    setLoading(false);
    if (errors.length) setError(errors.join(', '));
  };

  return { linearProjects, clockifyProjects, loading, error, refresh: fetchProjects };
}
