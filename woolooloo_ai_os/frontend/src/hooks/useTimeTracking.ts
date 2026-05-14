'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClockifyUser,
  ClockifyProject,
  ClockifyTimeEntry,
  getUsers,
  getProjects,
  getTimeEntries,
} from '@/lib/clockify';
import { startOfMonth } from 'date-fns';
import { Client, getClients, seedMockClients } from '@/lib/clients';

interface DateRange {
  start: Date;
  end: Date;
}

interface UseTimeTrackingReturn {
  entries: ClockifyTimeEntry[];
  users: ClockifyUser[];
  projects: ClockifyProject[];
  clients: Client[];
  dateRange: DateRange;
  selectedClientId: string | null;
  selectedUserId: string | null;
  selectedProjectId: string | null;
  totals: {
    totalHours: number;
    totalAmount: number;
    byUser: Map<string, { hours: number; amount: number }>;
  };
  loading: boolean;
  error: string | null;
  isClockifyConfigured: boolean;
  setDateRange: (range: DateRange) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedUserId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  syncData: () => Promise<void>;
}

export function useTimeTracking(): UseTimeTrackingReturn {
  const [entries, setEntries] = useState<ClockifyTimeEntry[]>([]);
  const [users, setUsers] = useState<ClockifyUser[]>([]);
  const [projects, setProjects] = useState<ClockifyProject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: new Date(),
  });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClockifyConfigured, setIsClockifyConfigured] = useState(false);

  const fetchClients = useCallback(async () => {
    seedMockClients();
    setClients(getClients());
  }, []);

  const fetchClockifyMeta = useCallback(async () => {
    try {
      const [usersData, projectsData] = await Promise.all([getUsers(), getProjects()]);
      setUsers(usersData);
      setProjects(projectsData);
      setIsClockifyConfigured(true);
    } catch (err) {
      console.warn('[Clockify] Failed to fetch metadata:', err);
      setUsers([]);
      setProjects([]);
      setIsClockifyConfigured(false);
    }
  }, []);

  const fetchTimeEntries = useCallback(async () => {
    try {
      setError(null);
      if (!isClockifyConfigured) return;

      const formatted = {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0],
      };

      const data = await getTimeEntries(formatted);
      setEntries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch time entries';
      setError(message);
    }
  }, [isClockifyConfigured, dateRange]);

  // Filter by client (map client ID to Clockify project IDs)
  const filteredByClient = useMemo(() => {
    if (!selectedClientId) return entries;
    const clockifyIds = clients
      .find(c => c.id === selectedClientId)
      ?.projects.flatMap((p: any) => p.clockifyProjectId ? [p.clockifyProjectId] : []) || [];
    if (!clockifyIds.length) return entries;
    return entries.filter(e => clockifyIds.includes(e.projectId));
  }, [entries, selectedClientId, clients]);

  // Filter by user
  const filteredByUser = useMemo(() => {
    if (!selectedUserId) return filteredByClient;
    return filteredByClient.filter(e => e.userId === selectedUserId);
  }, [filteredByClient, selectedUserId]);

  // Filter by project
  const filteredByProject = useMemo(() => {
    if (!selectedProjectId) return filteredByUser;
    return filteredByUser.filter(e => e.projectId === selectedProjectId);
  }, [filteredByUser, selectedProjectId]);

  const finalEntries = filteredByProject;

  const calculateTotals = useCallback(() => {
    const byUser = new Map<string, { hours: number; amount: number }>();

    finalEntries.forEach((entry) => {
      const hours = entry.duration / 3600;
      const amount = entry.billable ? entry.billableAmount : 0;

      const existing = byUser.get(entry.userId) || { hours: 0, amount: 0 };
      byUser.set(entry.userId, {
        hours: existing.hours + hours,
        amount: existing.amount + amount,
      });
    });

    const totalHours = Array.from(byUser.values()).reduce((sum, u) => sum + u.hours, 0);
    const totalAmount = Array.from(byUser.values()).reduce((sum, u) => sum + u.amount, 0);

    return { totalHours, totalAmount, byUser };
  }, [finalEntries]);

  const syncData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchClockifyMeta(), fetchTimeEntries()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchClients();
      await fetchClockifyMeta();
      setLoading(false);
    };
    init();
  }, [fetchClients, fetchClockifyMeta]);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  useEffect(() => {
    if (selectedClientId) setSelectedProjectId(null);
  }, [selectedClientId]);

  return {
    entries: finalEntries,
    users,
    projects,
    clients,
    dateRange,
    selectedClientId,
    selectedUserId,
    selectedProjectId,
    totals: calculateTotals(),
    loading,
    error,
    isClockifyConfigured,
    setDateRange,
    setSelectedClientId,
    setSelectedUserId,
    setSelectedProjectId,
    syncData,
  };
}

export function getDateRangePresets(): { label: string; getRange: () => DateRange }[] {
  const today = new Date();
  const thisMonthStart = startOfMonth(today);
  const lastMonthStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1));
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth() - 1, new Date(today.getFullYear(), today.getMonth(), 0).getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay() + 1);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  return [
    { label: 'This Month', getRange: () => ({ start: thisMonthStart, end: today }) },
    { label: 'Last Month', getRange: () => ({ start: lastMonthStart, end: lastMonthEnd }) },
    { label: 'This Week', getRange: () => ({ start: thisWeekStart, end: today }) },
  ];
}
