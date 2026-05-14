'use client';

import { useState, useEffect } from 'react';
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
import { startOfMonth, format } from 'date-fns';

interface UseExternalProjectsReturn {
  linearProjects: LinearProject[];
  clockifyProjects: ClockifyProject[];
  linearTasks: LinearTask[];
  clockifyEntries: ClockifyTimeEntry[];
  loading: boolean;
  error: string | null;
}

export function useExternalProjects(): UseExternalProjectsReturn {
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [clockifyProjects, setClockifyProjects] = useState<ClockifyProject[]>([]);
  const [linearTasks, setLinearTasks] = useState<LinearTask[]>([]);
  const [clockifyEntries, setClockifyEntries] = useState<ClockifyTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLinearConfigured = !!getConfig().LINEAR_API_KEY;
  const isClockifyConfigured = !!getConfig().CLOCKIFY_API_KEY;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const errors: string[] = [];

    if (isLinearConfigured) {
      try {
        const [projs, tasks] = await Promise.all([getLinearProjects(), getLinearTasks()]);
        setLinearProjects(projs);
        setLinearTasks(tasks);
      } catch {
        errors.push('Failed to fetch Linear data');
      }
    }

    if (isClockifyConfigured) {
      try {
        const today = new Date();
        const start = startOfMonth(today);
        const [projs, entries] = await Promise.all([
          getClockifyProjects(),
          getClockifyTimeEntries({

            start: format(start, 'yyyy-MM-dd'),
            end: format(today, 'yyyy-MM-dd'),
          }),
        ]);
        setClockifyProjects(projs);
        setClockifyEntries(entries);
      } catch {
        errors.push('Failed to fetch Clockify data');
      }
    }

    setLoading(false);
    if (errors.length && (isLinearConfigured || isClockifyConfigured)) {
      setError(errors.join(', '));
    }
  };

  return { linearProjects, clockifyProjects, linearTasks, clockifyEntries, loading, error };
}
