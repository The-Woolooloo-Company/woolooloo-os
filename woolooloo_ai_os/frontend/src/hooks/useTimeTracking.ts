'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ClockifyUser,
  ClockifyProject,
  ClockifyTimeEntry,
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
  syncing: boolean;
  error: string | null;
  lastSynced: Date | null;
  setDateRange: (range: DateRange) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedUserId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  syncData: () => Promise<void>;
}

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0];
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
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all Clockify data through the server proxy (users + projects + time entries)
  const fetchAllClockify = useCallback(async (forceSync = false) => {
    const start = formatDateParam(dateRange.start);
    const end = formatDateParam(dateRange.end);
    const syncParam = forceSync ? '&sync=true' : '';
    const url = `/api/clockify?type=all&start=${start}&end=${end}${syncParam}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Clockify proxy error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    setUsers(data.users || []);
    setProjects(data.projects || []);
    setEntries(data.timeEntries || []);
    setLastSynced(new Date());
  }, [dateRange]);

  const fetchClients = useCallback(async () => {
    seedMockClients();
    setClients(getClients());
  }, []);

  const syncData = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await fetchAllClockify(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Clockify data');
    } finally {
      setSyncing(false);
    }
  }, [fetchAllClockify]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchClients(), fetchAllClockify()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Clockify data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchClients, fetchAllClockify]);

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchAllClockify();
    }, AUTO_SYNC_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAllClockify]);

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
    syncing,
    error,
    lastSynced,
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
    { label: 'This Week', getRange: () => ({ start: thisWeekStart, end: thisWeekEnd }) },
  ];
}
