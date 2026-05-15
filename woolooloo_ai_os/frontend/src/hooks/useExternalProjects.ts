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
} from '@/lib/clockify';
import { getConfig } from '@/lib/config-store';

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

    // Fetch Linear projects directly
    if (isLinearConfigured) {
      try {
        const projs = await getLinearProjects();
        setLinearProjects(projs);
      } catch {
        errors.push('Failed to fetch Linear projects');
      }
    }

    // Fetch Clockify + Linear via proxy API (bypasses CORS, cached)
    if (isClockifyConfigured) {
      try {
        const res = await fetch('/api/clockify?type=all');
        const data = await res.json();

        // Map proxy response to expected types
        const projects: ClockifyProject[] = (data.projects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        setClockifyProjects(projects);

        // Map Linear tasks from proxy (has different field names)
        const tasks: LinearTask[] = (data.linearTasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: '',
          state: t.state || { id: '', name: 'Unknown', type: 'unstarted' as const },
          priority: (t.priority ?? 0) as 0 | 1 | 2 | 3,
          projectId: t.projectId || '',
          projectTitle: t.projectName || '',
          projectKey: t.identifier || '',
          assigneeId: t.assigneeId,
          assigneeName: t.assigneeName,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
        setLinearTasks(tasks);

        // Time entries from proxy
        const entries: ClockifyTimeEntry[] = (data.timeEntries || []).map((e: any) => ({
          id: e.id,
          projectId: e.projectId || '',
          projectName: e.projectName || '',
          userId: e.userId || '',
          userName: e.userName || 'Unknown',
          userEmail: e.userEmail || '',
          description: e.description || '',
          start: e.start || '',
          end: e.end || null,
          duration: e.duration || 0,
          billable: e.billable || false,
          billableRate: e.billableRate || 0,
          billableAmount: e.billableAmount || 0,
        }));
        setClockifyEntries(entries);
      } catch {
        errors.push('Failed to fetch Clockify data via proxy');
      }
    }

    setLoading(false);
    if (errors.length && (isLinearConfigured || isClockifyConfigured)) {
      setError(errors.join(', '));
    }
  };

  return { linearProjects, clockifyProjects, linearTasks, clockifyEntries, loading, error };
}
