"use client";

import { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClients, getAllProjects, Client, ClientProject } from "@/lib/clients";
import { useExternalProjects } from "@/hooks/useExternalProjects";
import { getStaff } from "@/lib/staff";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isSameWeek, subWeeks, addWeeks, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";

// Recharts
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

// ─── Color palette ─────────────────────────────────────────────────
const COLORS = [
  "#E53935", // red (primary)
  "#00897B", // teal (secondary)
  "#FF6D00", // amber
  "#5E35B1", // deep purple
  "#0097A7", // cyan
  "#6D4C41", // brown
  "#1565C0", // blue
  "#C62828", // dark red
];

// ─── Quick Stats ──────────────────────────────────────────────────
interface QuickStatCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  color: "primary" | "secondary" | "tertiary" | "error";
}

function QuickStatCard({ icon, label, value, subtitle, color }: QuickStatCardProps) {
  const colorMap = {
    primary: "bg-md-primary-container text-md-on-primary-container",
    secondary: "bg-md-secondary-container text-md-on-secondary-container",
    tertiary: "bg-md-tertiary-container text-md-on-tertiary-container",
    error: "bg-md-error-container text-md-on-error-container",
  };
  return (
    <Card className="hover:shadow-md-2 transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            <span className="material-symbols-rounded text-24">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-body-small text-md-on-surface-variant">{label}</p>
            <p className="text-headline-small font-semibold text-md-on-surface">{value}</p>
            {subtitle && <p className="text-body-small text-md-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab selector ─────────────────────────────────────────────────
type ReportTab = "overview" | "projects" | "team" | "time";

function TabBar({ active, onChange }: { active: ReportTab; onChange: (t: ReportTab) => void }) {
  const tabs: { key: ReportTab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "projects", label: "Projects", icon: "folder_open" },
    { key: "team", label: "Team", icon: "groups" },
    { key: "time", label: "Time & Billing", icon: "schedule" },
  ];
  return (
    <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-label-medium font-medium transition-colors whitespace-nowrap ${
            active === tab.key
              ? "bg-md-primary text-md-on-primary shadow-md-1"
              : "text-md-on-surface-variant hover:bg-md-on-surface/5"
          }`}
        >
          <span className="material-symbols-rounded text-18">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Custom tooltip formatter ─────────────────────────────────────
function RTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-md-surface-container-high rounded-lg p-3 shadow-md-2 border border-md-outline-variant/30">
      <p className="text-label-medium text-md-on-surface font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-body-small" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { clockifyEntries, linearTasks, loading: dataLoading } = useExternalProjects();
  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<{ project: ClientProject; client: Client }[]>([]);
  const [staff] = useState(() => getStaff());
  const [tab, setTab] = useState<ReportTab>("overview");
  const [searchInput, setSearchInput] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  // ─── Date range state ─────────────────────────────────────────
  const [dateRange, setDateRange] = useState(() => ({
    start: startOfMonth(new Date()),
    end: new Date(),
  }));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [preset, setPreset] = useState<"thisMonth" | "lastMonth" | "thisWeek" | "thisQuarter" | "allTime">("thisMonth");

  // Keep custom inputs in sync
  useEffect(() => {
    setCustomStart(format(dateRange.start, 'yyyy-MM-dd'));
    setCustomEnd(format(dateRange.end, 'yyyy-MM-dd'));
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const applyPreset = (p: typeof preset) => {
    setPreset(p);
    setShowCustom(false);
    const today = new Date();
    let range: { start: Date; end: Date };
    switch (p) {
      case 'thisMonth': range = { start: startOfMonth(today), end: today }; break;
      case 'lastMonth': range = { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) }; break;
      case 'thisWeek': range = { start: startOfWeek(today, { weekStartsOn: 1 }), end: today }; break;
      case 'thisQuarter': range = { start: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), end: today }; break;
      case 'allTime': range = { start: new Date(2020, 0, 1), end: today }; break;
      default: range = { start: startOfMonth(today), end: today };
    }
    setDateRange(range);
  };

  useEffect(() => {
    setClients(getClients());
    setAllProjects(getAllProjects());
  }, []);

  const searchTerm = searchInput.toLowerCase();

  // ─── Filtered data (by date range + search) ────────────────────
  const filteredEntries = useMemo(() => {
    let entries = clockifyEntries.filter((e: any) => {
      if (!e.start) return false;
      try {
        const d = parseISO(e.start);
        return d >= dateRange.start && d <= dateRange.end;
      } catch { return false; }
    });
    if (searchTerm) {
      entries = entries.filter(
        (e: any) =>
          e.userName?.toLowerCase().includes(searchTerm) ||
          e.projectName?.toLowerCase().includes(searchTerm) ||
          e.description?.toLowerCase().includes(searchTerm)
      );
    }
    return entries;
  }, [clockifyEntries, searchTerm, dateRange]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return allProjects;
    return allProjects.filter(
      ({ project, client }) =>
        project.name.toLowerCase().includes(searchTerm) ||
        client.name.toLowerCase().includes(searchTerm)
    );
  }, [allProjects, searchTerm]);

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return linearTasks;
    return linearTasks.filter(
      (t: any) =>
        t.title.toLowerCase().includes(searchTerm) ||
        t.projectTitle?.toLowerCase().includes(searchTerm)
    );
  }, [linearTasks, searchTerm]);

  // ─── Daily hours (selected date range) ────────────────────────
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const map = new Map<string, { date: string; hours: number; billable: number; amount: number }>();
    days.forEach(day => {
      const ds = format(day, "yyyy-MM-dd");
      map.set(ds, { date: ds, hours: 0, billable: 0, amount: 0 });
    });
    filteredEntries.forEach((e: any) => {
      if (!e.start) return;
      try {
        const ds = format(parseISO(e.start), "yyyy-MM-dd");
        const d = map.get(ds);
        if (d) {
          const h = e.duration / 3600;
          d.hours += h;
          if (e.billable) { d.billable += h; d.amount += h * (e.billableRate || 0); }
        }
      } catch { /* skip */ }
    });
    return Array.from(map.values())
      .filter(d => d.hours > 0)
      .map(d => ({
        ...d,
        dateLabel: format(parseISO(d.date), "MMM d"),
        hours: Math.round(d.hours * 10) / 10,
        billable: Math.round(d.billable * 10) / 10,
      }));
  }, [filteredEntries, dateRange]);

  // ─── Weekly comparison (relative to date range end) ────────────
  const weeklyData = useMemo(() => {
    const refWeekStart = startOfWeek(dateRange.end, { weekStartsOn: 1 });
    const refWeekEnd = endOfWeek(dateRange.end, { weekStartsOn: 1 });
    const prevWeekStart = subWeeks(refWeekStart, 1);
    const prevWeekEnd = refWeekStart;
    const days = eachDayOfInterval({ start: prevWeekStart, end: refWeekEnd });
    const map = new Map<string, { dateLabel: string; current: number; previous: number }>();
    days.forEach(day => {
      const ds = format(day, "yyyy-MM-dd");
      map.set(ds, { dateLabel: format(day, "EEE"), current: 0, previous: 0 });
    });
    filteredEntries.forEach((e: any) => {
      if (!e.start) return;
      try {
        const d = parseISO(e.start);
        const h = e.duration / 3600;
        if (d >= refWeekStart && d <= refWeekEnd) {
          const ds = format(d, "yyyy-MM-dd");
          const entry = map.get(ds);
          if (entry) entry.current += h;
        } else if (d >= prevWeekStart && d < prevWeekEnd) {
          const ds = format(d, "yyyy-MM-dd");
          const entry = map.get(ds);
          if (entry) entry.previous += h;
        }
      } catch { /* skip */ }
    });
    return Array.from(map.values()).map(d => ({
      ...d,
      current: Math.round(d.current * 10) / 10,
      previous: Math.round(d.previous * 10) / 10,
    }));
  }, [filteredEntries, dateRange]);

  // ─── Hours by project ──────────────────────────────────────────
  const projectHours = useMemo(() => {
    const map = new Map<string, { name: string; client: string; hours: number; amount: number; entries: number }>();
    filteredEntries.forEach((e: any) => {
      const key = e.projectId || "unknown";
      const entry = map.get(key) || { name: e.projectName || "Unknown", client: "", hours: 0, amount: 0, entries: 0 };
      entry.hours += e.duration / 3600;
      entry.amount += (e.duration / 3600) * (e.billableRate || 0);
      entry.entries += 1;
      // Find client name
      if (!entry.client) {
        for (const { project, client } of allProjects) {
          if (project.clockifyProjectId === e.projectId) { entry.client = client.name; break; }
        }
      }
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([id, d]) => ({ ...d, projectId: id }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, allProjects]);

  // ─── Hours by staff ────────────────────────────────────────────
  const staffHours = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; billable: number; entries: number }>();
    filteredEntries.forEach((e: any) => {
      const key = e.userId || "unknown";
      const entry = map.get(key) || { name: e.userName || "Unknown", hours: 0, billable: 0, entries: 0 };
      entry.hours += e.duration / 3600;
      if (e.billable) entry.billable += e.duration / 3600;
      entry.entries += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([id, d]) => ({ ...d, userId: id, utilization: Math.min(100, Math.round((d.hours / 80) * 100)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredEntries]);

  // ─── Task breakdown per project ────────────────────────────────
  const projectTasks = useMemo(() => {
    return filteredProjects.map(({ project, client }) => {
      if (!project.linearProjectId) return null;
      const tasks = filteredTasks.filter((t: any) => t.projectId === project.linearProjectId);
      const completed = tasks.filter((t: any) => t.state?.type === "completed").length;
      const active = tasks.filter((t: any) => t.state?.type === "started").length;
      const backlog = tasks.filter((t: any) => t.state?.type === "unstarted").length;
      const total = tasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        projectId: project.id,
        projectName: project.name,
        clientName: client.name,
        total, completed, active, backlog, progress,
      };
    }).filter(Boolean).sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));
  }, [filteredProjects, filteredTasks]);

  // ─── Revenue by client ─────────────────────────────────────────
  const clientRevenue = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; billable: number; amount: number }>();
    filteredEntries.forEach((e: any) => {
      let clientName = "";
      for (const { project, client } of allProjects) {
        if (project.clockifyProjectId === e.projectId) { clientName = client.name; break; }
      }
      if (!clientName) return;
      const entry = map.get(clientName) || { name: clientName, hours: 0, billable: 0, amount: 0 };
      entry.hours += e.duration / 3600;
      if (e.billable) { entry.billable += e.duration / 3600; entry.amount += (e.duration / 3600) * (e.billableRate || 0); }
      map.set(clientName, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredEntries, allProjects]);

  // ─── Billable breakdown ────────────────────────────────────────
  const billableData = useMemo(() => {
    const billableHours = filteredEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + e.duration / 3600, 0);
    const nonBillable = filteredEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0) - billableHours;
    return [
      { name: "Billable", value: Math.round(billableHours * 10) / 10 },
      { name: "Non-billable", value: Math.round(nonBillable * 10) / 10 },
    ].filter(d => d.value > 0);
  }, [filteredEntries]);

  // ─── Top entries (longest) ─────────────────────────────────────
  const topEntries = useMemo(() => {
    return [...filteredEntries]
      .sort((a: any, b: any) => b.duration - a.duration)
      .slice(0, 10)
      .map((e: any) => ({
        ...e,
        hours: Math.round((e.duration / 3600) * 100) / 100,
        dateLabel: e.start ? format(parseISO(e.start), "MMM d, yyyy") : "—",
      }));
  }, [filteredEntries]);

  // ─── Aggregate stats ───────────────────────────────────────────
  const totalHours = useMemo(() =>
    filteredEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0),
    [filteredEntries]
  );

  const totalBillable = useMemo(() =>
    filteredEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + e.duration / 3600, 0),
    [filteredEntries]
  );

  const totalRevenue = useMemo(() =>
    filteredEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + (e.duration / 3600) * (e.billableRate || 0), 0),
    [filteredEntries]
  );

  const activeTasks = useMemo(() =>
    filteredTasks.filter((t: any) => t.state?.type !== "completed").length,
    [filteredTasks]
  );

  const completedTasks = useMemo(() =>
    filteredTasks.filter((t: any) => t.state?.type === "completed").length,
    [filteredTasks]
  );

  const avgUtilization = useMemo(() => {
    if (staffHours.length === 0) return 0;
    return Math.round(staffHours.reduce((s, d) => s + d.utilization, 0) / staffHours.length);
  }, [staffHours]);

  // ─── Chart axis defaults ───────────────────────────────────────
  const axisStyle = { fontSize: 12, fill: "var(--color-md-on-surface-variant)" };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-md-surface">
        <Navbar />
        <div className="pt-28 flex items-center justify-center">
          <div className="text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
            <p className="text-body-large text-md-on-surface-variant mt-4">Loading reports data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Reports & Analytics</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Project insights, team productivity, time tracking & billing
          </p>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search projects, team members, descriptions..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full"
            />
          </div>
          <TabBar active={tab} onChange={setTab} />
        </div>

        {/* ─── Date Range Navigation ─────────────────────────────── */}
        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            {/* Month stepper */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  setDateRange({
                    start: subMonths(dateRange.start, 1),
                    end: subMonths(dateRange.end, 1),
                  });
                  setShowCustom(false);
                }}
              >
                <span className="material-symbols-rounded text-20">chevron_left</span>
              </Button>

              <div className="text-center cursor-pointer" onClick={() => {
                setDateRange({ start: startOfMonth(new Date()), end: new Date() });
                setShowCustom(false);
                setPreset('thisMonth');
              }}>
                <p className="text-headline-small font-medium text-md-on-surface hover:text-md-primary transition-colors">
                  {isSameMonth(dateRange.start, new Date()) && !showCustom
                    ? format(dateRange.start, 'MMMM yyyy')
                    : `Custom: ${format(dateRange.start, 'MMM yyyy')} — ${format(dateRange.end, 'MMM yyyy')}`
                  }
                </p>
                <p className="text-body-small text-md-on-surface-variant mt-0.5">
                  {format(dateRange.start, 'MMM d')} — {format(dateRange.end, 'MMM d, yyyy')}
                </p>
              </div>

              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  setDateRange({
                    start: addMonths(dateRange.start, 1),
                    end: addMonths(dateRange.end, 1),
                  });
                  setShowCustom(false);
                }}
              >
                <span className="material-symbols-rounded text-20">chevron_right</span>
              </Button>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${preset === 'thisMonth' ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90' : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'}`} onClick={() => applyPreset('thisMonth')}>This Month</button>
              <button type="button" className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${preset === 'lastMonth' ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90' : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'}`} onClick={() => applyPreset('lastMonth')}>Last Month</button>
              <button type="button" className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${preset === 'thisWeek' ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90' : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'}`} onClick={() => applyPreset('thisWeek')}>This Week</button>
              <button type="button" className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${preset === 'thisQuarter' ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90' : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'}`} onClick={() => applyPreset('thisQuarter')}>This Quarter</button>
              <button type="button" className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${preset === 'allTime' ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90' : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'}`} onClick={() => applyPreset('allTime')}>All Time</button>
              <div className="border-l border-md-outline-variant/50 mx-1" />
              {showCustom ? (
                <button type="button" className="px-4 py-2 rounded-full text-label-medium bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 transition-all duration-200" onClick={() => setShowCustom(false)}>Hide Custom</button>
              ) : (
                <button type="button" className="px-4 py-2 rounded-full text-label-medium bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest transition-all duration-200" onClick={() => setShowCustom(true)}>
                  <span className="material-symbols-rounded text-18 align-middle">calendar_today</span>
                  Custom Range
                </button>
              )}
            </div>

            {/* Custom date inputs */}
            {showCustom && (
              <div className="flex items-end gap-3 mt-4 pt-4 border-t border-md-outline-variant/50">
                <div className="flex-1">
                  <label className="text-body-small text-md-on-surface-variant mb-1 block">From</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} max={customEnd} className="w-full rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2" />
                </div>
                <span className="material-symbols-rounded text-24 text-md-on-surface-variant mb-3">arrow_right</span>
                <div className="flex-1">
                  <label className="text-body-small text-md-on-surface-variant mb-1 block">To</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart} className="w-full rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2" />
                </div>
                <Button variant="filled" size="sm" onClick={() => {
                  if (customStart && customEnd) setDateRange({ start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') });
                }}>Apply</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Quick Stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickStatCard icon="schedule" label="Total Hours" value={`${totalHours.toFixed(1)}h`} subtitle={`${totalBillable.toFixed(1)}h billable`} color="primary" />
          <QuickStatCard icon="payments" label="Revenue" value={`R${Math.round(totalRevenue).toLocaleString()}`} subtitle={`${(totalBillable / Math.max(totalHours, 1) * 100).toFixed(0)}% billable`} color="secondary" />
          <QuickStatCard icon="checklist" label="Tasks" value={`${activeTasks}`} subtitle={`${completedTasks} completed`} color="tertiary" />
          <QuickStatCard icon="monitoring" label="Utilization" value={`${avgUtilization}%`} subtitle={`${staffHours.length} active`} color="secondary" />
        </div>

        {/* ─── Overview Tab ────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Daily Hours + Billable */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Hours — {format(dateRange.start, 'MMM d')} to {format(dateRange.end, 'MMM d, yyyy')}</CardTitle>
                <CardDescription>Hours logged per day (billable overlay)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="dateLabel" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="hours" name="Total Hours" stroke="var(--color-md-primary)" fill="var(--color-md-primary)" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="billable" name="Billable" stroke="var(--color-md-secondary)" fill="var(--color-md-secondary)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Billable Donut + Hours by Staff */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billable vs Non-Billable</CardTitle>
                  <CardDescription>Time allocation breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={billableData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill="var(--color-md-primary)" />
                        <Cell fill="var(--color-md-surface-variant)" />
                      </Pie>
                      <Tooltip content={<RTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hours by Team Member</CardTitle>
                  <CardDescription>Top loggers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={staffHours.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                      <XAxis dataKey="name" tick={axisStyle} />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<RTooltip />} />
                      <Legend />
                      <Bar dataKey="hours" name="Hours" fill="var(--color-md-primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="billable" name="Billable" fill="var(--color-md-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue by Client */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Client</CardTitle>
                <CardDescription>Billing amounts from time entries</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(260, clientRevenue.length * 50)}>
                  <BarChart data={clientRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis type="number" tick={axisStyle} />
                    <YAxis type="category" dataKey="name" tick={axisStyle} width={120} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Bar dataKey="amount" name="Revenue (R)" fill="var(--color-md-secondary)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="billable" name="Billable Hours" fill="var(--color-md-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Projects Tab ────────────────────────────────────── */}
        {tab === "projects" && (
          <div className="space-y-6">
            {/* Task Status by Project */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status by Project</CardTitle>
                <CardDescription>Completed vs active vs backlog</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(320, projectTasks.length * 40 + 60)}>
                  <BarChart data={projectTasks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="projectName" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="var(--color-md-secondary)" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="active" name="Active" fill="var(--color-md-primary)" stackId="a" />
                    <Bar dataKey="backlog" name="Backlog" fill="var(--color-md-surface-variant)" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hours by Project */}
            <Card>
              <CardHeader>
                <CardTitle>Hours by Project</CardTitle>
                <CardDescription>Time spent per project this month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(320, projectHours.length * 40 + 60)}>
                  <BarChart data={projectHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="name" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="var(--color-md-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="entries" name="Entries" fill="var(--color-md-tertiary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Project detail table */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress Detail</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-md-outline-variant/50">
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Project</th>
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Client</th>
                        <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Total</th>
                        <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Done</th>
                        <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Active</th>
                        <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Backlog</th>
                        <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTasks.map(pt => (
                        <tr key={pt!.projectId} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                          <td className="py-3 px-4 text-body-medium text-md-primary font-medium">{pt!.projectName}</td>
                          <td className="py-3 px-4 text-body-medium text-md-on-surface-variant">{pt!.clientName}</td>
                          <td className="py-3 px-4 text-center text-body-medium text-md-on-surface">{pt!.total}</td>
                          <td className="py-3 px-4 text-center"><Badge variant="secondary-tonal">{pt!.completed}</Badge></td>
                          <td className="py-3 px-4 text-center"><Badge variant="primary-tonal">{pt!.active}</Badge></td>
                          <td className="py-3 px-4 text-center"><Badge variant="secondary-outlined">{pt!.backlog}</Badge></td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-md-surface-variant overflow-hidden">
                                <div className="h-full rounded-full bg-md-primary transition-all" style={{ width: `${pt!.progress}%` }} />
                              </div>
                              <span className="text-body-small text-md-on-surface-variant min-w-[35px] text-right">{pt!.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {projectTasks.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-body-medium text-md-on-surface-variant">No projects with Linear integration</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Team Tab ────────────────────────────────────────── */}
        {tab === "team" && (
          <div className="space-y-6">
            {/* Utilization bars */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Utilization</CardTitle>
                <CardDescription>Hours logged vs 80h monthly target</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {staffHours.map(sh => (
                    <div key={sh.userId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-label-large font-medium">
                            {sh.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-label-large font-medium text-md-on-surface">{sh.name}</p>
                            <p className="text-body-small text-md-on-surface-variant">{sh.entries} entries</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-title-medium font-semibold text-md-on-surface">{sh.hours.toFixed(1)}h</p>
                          <p className="text-body-small text-md-on-surface-variant">{sh.billable.toFixed(1)}h billable · {sh.utilization}% util</p>
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-md-surface-variant overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, sh.utilization)}%`,
                            backgroundColor: sh.utilization >= 80 ? "var(--color-md-secondary)" : sh.utilization >= 40 ? "var(--color-md-primary)" : "var(--color-md-tertiary)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {staffHours.length === 0 && (
                    <p className="text-center py-8 text-body-medium text-md-on-surface-variant">No time tracking data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Comparison */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Comparison</CardTitle>
                    <CardDescription>This week vs last week</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="text" size="sm" onClick={() => setWeekOffset(o => Math.max(o - 1, -8))}>
                      <span className="material-symbols-rounded text-18">arrow_back</span>
                    </Button>
                    <Button variant="text" size="sm" onClick={() => setWeekOffset(o => o + 1)}>
                      <span className="material-symbols-rounded text-18">arrow_forward</span>
                    </Button>
                    <Button variant="text" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="dateLabel" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Bar dataKey="current" name="This Week" fill="var(--color-md-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previous" name="Last Week" fill="var(--color-md-surface-variant)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top time entries */}
            <Card>
              <CardHeader>
                <CardTitle>Longest Time Entries</CardTitle>
                <CardDescription>Top 10 by duration</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-md-outline-variant/50">
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">User</th>
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Project</th>
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Description</th>
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Date</th>
                        <th className="text-right py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Hours</th>
                        <th className="text-right py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Billable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topEntries.map((te: any, i) => (
                        <tr key={i} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-body-small font-medium">
                                {te.userName?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-body-medium text-md-on-surface">{te.userName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-body-medium text-md-primary">{te.projectName}</td>
                          <td className="py-3 px-4 text-body-medium text-md-on-surface-variant max-w-xs truncate">{te.description || "—"}</td>
                          <td className="py-3 px-4 text-body-small text-md-on-surface-variant">{te.dateLabel}</td>
                          <td className="py-3 px-4 text-right text-body-medium font-medium text-md-on-surface">{te.hours.toFixed(2)}h</td>
                          <td className="py-3 px-4 text-right">
                            {te.billable ? (
                              <Badge variant="secondary-tonal">R{(te.hours * (te.billableRate || 0)).toFixed(0)}</Badge>
                            ) : (
                              <Badge variant="secondary-outlined">No</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {topEntries.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-body-medium text-md-on-surface-variant">No time entries found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Time & Billing Tab ──────────────────────────────── */}
        {tab === "time" && (
          <div className="space-y-6">
            {/* Daily Hours Trend (line) */}
            <Card>
              <CardHeader>
                <CardTitle>Hours Trend — {format(dateRange.start, 'MMM d')} to {format(dateRange.end, 'MMM d, yyyy')}</CardTitle>
                <CardDescription>Daily logged hours with running average</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="dateLabel" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="hours" name="Hours" stroke="var(--color-md-primary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="billable" name="Billable Hours" stroke="var(--color-md-secondary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Billing amounts per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData.filter(d => d.amount > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis dataKey="dateLabel" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip content={<RTooltip />} />
                    <Bar dataKey="amount" name="Revenue (R)" fill="var(--color-md-secondary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hours by Project (horizontal bars) */}
            <Card>
              <CardHeader>
                <CardTitle>Hours Breakdown by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(300, projectHours.length * 50)}>
                  <BarChart data={projectHours} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-md-outline-variant)" opacity={0.3} />
                    <XAxis type="number" tick={axisStyle} />
                    <YAxis type="category" dataKey="name" tick={axisStyle} width={140} />
                    <Tooltip content={<RTooltip />} />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="var(--color-md-primary)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="amount" name="Revenue (R)" fill="var(--color-md-secondary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle>Time Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Total Hours</span><span className="text-body-medium font-medium text-md-on-surface">{totalHours.toFixed(1)}h</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Billable Hours</span><span className="text-body-medium font-medium text-md-secondary">{totalBillable.toFixed(1)}h</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Billable %</span><span className="text-body-medium font-medium text-md-on-surface">{(totalHours > 0 ? (totalBillable / totalHours * 100) : 0).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Total Entries</span><span className="text-body-medium font-medium text-md-on-surface">{filteredEntries.length}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Avg per Entry</span><span className="text-body-medium font-medium text-md-on-surface">{(totalHours / Math.max(filteredEntries.length, 1)).toFixed(1)}h</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Billing Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Total Revenue</span><span className="text-body-medium font-semibold text-md-secondary">R{Math.round(totalRevenue).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Billable Entries</span><span className="text-body-medium font-medium text-md-on-surface">{filteredEntries.filter((e: any) => e.billable).length}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Non-billable Entries</span><span className="text-body-medium font-medium text-md-on-surface">{filteredEntries.filter((e: any) => !e.billable).length}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Avg Rate/hr</span><span className="text-body-medium font-medium text-md-on-surface">R{totalBillable > 0 ? (totalRevenue / totalBillable).toFixed(0) : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Projects</span><span className="text-body-medium font-medium text-md-on-surface">{projectHours.length}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Task Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Total Tasks</span><span className="text-body-medium font-medium text-md-on-surface">{filteredTasks.length}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Active</span><span className="text-body-medium font-medium text-md-primary">{activeTasks}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Completed</span><span className="text-body-medium font-medium text-md-secondary">{completedTasks}</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Completion Rate</span><span className="text-body-medium font-medium text-md-on-surface">{filteredTasks.length > 0 ? (completedTasks / filteredTasks.length * 100).toFixed(0) : "—"}%</span></div>
                  <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Projects w/ Tasks</span><span className="text-body-medium font-medium text-md-on-surface">{projectTasks.filter(p => p!.total > 0).length}</span></div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
