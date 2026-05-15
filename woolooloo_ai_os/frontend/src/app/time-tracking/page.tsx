"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { formatDurationSeconds } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from "date-fns";

export default function TimeTrackingPage() {
  const {
    entries,
    users,
    projects,
    totals,
    loading,
    syncing,
    error,
    lastSynced,
    syncData,
    dateRange,
    setDateRange,
    selectedUserId,
    selectedProjectId,
    setSelectedUserId,
    setSelectedProjectId,
  } = useTimeTracking();

  const [viewMode, setViewMode] = useState<"list" | "user" | "project">("list");
  const [search, setSearch] = useState("");
  const [showUnmatched, setShowUnmatched] = useState(true);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Keep custom date inputs in sync when dateRange changes
  useMemo(() => {
    setCustomStart(format(dateRange.start, 'yyyy-MM-dd'));
    setCustomEnd(format(dateRange.end, 'yyyy-MM-dd'));
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const filtered = entries.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.userName.toLowerCase().includes(search.toLowerCase()) ||
      e.projectName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!showUnmatched && !e.matchedLinearTask) return false;
    return true;
  });

  const presets = useMemo(() => [
    { label: 'Today', getRange: () => ({ start: new Date(), end: new Date() }) },
    { label: 'This Week', getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }) },
    { label: 'This Month', getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
    { label: 'Last Month', getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  ], []);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-display-small text-md-on-surface">Time Tracking</h1>
            <p className="text-body-large text-md-on-surface-variant mt-1">
              Track and manage team time entries from Clockify
              {lastSynced && (
                <span className="text-body-small text-md-on-surface-variant/60 ml-2">
                  · Last synced {lastSynced.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outlined"
            size="sm"
            onClick={syncData}
            disabled={syncing}
          >
            {syncing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-md-on-surface border-r-transparent" />
            ) : (
              <span className="material-symbols-rounded text-18">sync</span>
            )}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="schedule" label="Total Hours" value={`${totals.totalHours.toFixed(1)}h`} color="primary" />
          <StatCard icon="payments" label="Billable" value={`R${totals.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="success" />
          <StatCard icon="fact_check" label="Entries" value={`${filtered.length}`} color="info" />
          <StatCard icon="groups" label="Team" value={`${users.length}`} color="warning" />
        </div>

        {/* Date Range Navigation */}
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
              }}>
                <p className="text-headline-small font-medium text-md-on-surface hover:text-md-primary transition-colors">
                  {format(dateRange.start, 'MMMM yyyy')}
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
              {presets.map(preset => {
                const isActive = preset.label === 'This Month' && isSameMonth(dateRange.start, new Date()) && !showCustom;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`px-4 py-2 rounded-full text-label-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90'
                        : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'
                    }`}
                    onClick={() => {
                      setDateRange(preset.getRange());
                      setShowCustom(false);
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <div className="border-l border-md-outline-variant/50 mx-1" />
              {showCustom ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-label-medium bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/90 transition-all duration-200"
                  onClick={() => setShowCustom(false)}
                >
                  Hide Custom
                </button>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-label-medium bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest transition-all duration-200"
                  onClick={() => setShowCustom(true)}
                >
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
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    max={customEnd}
                    className="w-full rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2"
                  />
                </div>
                <span className="material-symbols-rounded text-24 text-md-on-surface-variant mb-3">arrow_right</span>
                <div className="flex-1">
                  <label className="text-body-small text-md-on-surface-variant mb-1 block">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    min={customStart}
                    className="w-full rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2"
                  />
                </div>
                <Button
                  variant="filled"
                  size="sm"
                  onClick={() => {
                    if (customStart && customEnd) {
                      setDateRange({
                        start: new Date(customStart + 'T00:00:00'),
                        end: new Date(customEnd + 'T23:59:59'),
                      });
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search entries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                startIcon={<span className="material-symbols-rounded text-20">search</span>}
              />
              <select
                className="rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 min-h-[48px]"
                value={selectedUserId || ""}
                onChange={e => setSelectedUserId(e.target.value || null)}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.userName}</option>
                ))}
              </select>
              <select
                className="rounded-lg border border-md-outline-variant bg-transparent px-4 py-2.5 text-md-on-surface focus:outline-none focus:border-md-primary focus:border-2 min-h-[48px]"
                value={selectedProjectId || ""}
                onChange={e => setSelectedProjectId(e.target.value || null)}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "list" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <span className="material-symbols-rounded text-18">list</span>
                </Button>
                <Button
                  variant={viewMode === "user" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setViewMode("user")}
                >
                  <span className="material-symbols-rounded text-18">groups</span>
                </Button>
                <Button
                  variant={viewMode === "project" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setViewMode("project")}
                >
                  <span className="material-symbols-rounded text-18">folder</span>
                </Button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnmatched(!showUnmatched)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-medium transition-all duration-200 ${
                  !showUnmatched
                    ? 'bg-md-primary text-md-on-primary'
                    : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'
                }`}
              >
                <span className="material-symbols-rounded text-16">link</span>
                {showUnmatched ? 'Showing all' : 'Matched only'}
              </button>
              <span className="text-body-small text-md-on-surface-variant">
                {entries.filter(e => e.matchedLinearTask).length} of {entries.length} entries matched to Linear
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-md-error-container text-md-on-error-container p-4 mb-6 flex items-center gap-3">
            <span className="material-symbols-rounded text-24">error</span>
            <p className="text-label-large">{error}</p>
          </div>
        )}

        {/* Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">schedule</span>
                <p className="text-body-large text-md-on-surface-variant mt-4">No time entries found</p>
              </div>
            ) : (
              <div className="divide-y divide-md-outline-variant/50">
                {filtered.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 py-4 hover:bg-md-on-surface/5 transition-colors rounded-lg px-2">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-on-secondary-container text-label-large flex-shrink-0">
                      {entry.userName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-label-large font-medium text-md-on-surface truncate">
                        {entry.description || "No description"}
                      </p>
                      <p className="text-body-small text-md-on-surface-variant">
                        {entry.userName} · {new Date(entry.start).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {entry.matchedLinearTask && (
                        <p className="text-body-small text-md-on-surface-variant mt-0.5">
                          <span className="material-symbols-rounded text-16 align-middle">link</span>
                          <span className="text-md-primary font-medium">{entry.matchedLinearTask.identifier}</span>
                          <span className="text-body-small"> — {entry.matchedLinearTask.title}</span>
                          <StateBadge type={entry.matchedLinearTask.state.type} />
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="primary-tonal">{entry.projectName}</Badge>
                      <Badge variant="secondary-tonal">{formatDurationSeconds(entry.duration)}</Badge>
                      {entry.billable && (
                        <Badge variant="success-tonal">R{entry.billableAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StateBadge({ type }: { type: 'unstarted' | 'started' | 'completed' }) {
  const colors = {
    unstarted: 'bg-md-secondary-container text-md-on-secondary-container',
    started: 'bg-md-tertiary-container text-md-on-tertiary-container',
    completed: 'bg-success text-on-success',
  };
  return (
    <span className={`ml-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[type]}`}>
      {type === 'completed' ? 'Done' : type === 'started' ? 'In Progress' : 'Unstarted'}
    </span>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  color: "primary" | "secondary" | "success" | "warning" | "info" | "error";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary",
    secondary: "bg-md-secondary text-md-on-secondary",
    success: "bg-success text-on-success",
    warning: "bg-warning text-on-warning",
    info: "bg-info text-on-info",
    error: "bg-md-error text-md-on-error",
  };

  return (
    <Card className="hover:shadow-md-2 transition-shadow duration-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md-1 ${colorMap[color]}`}>
            <span className="material-symbols-rounded text-24">{icon}</span>
          </div>
          <div>
            <p className="text-label-medium text-md-on-surface-variant">{label}</p>
            <p className="text-headline-small font-medium text-md-on-surface">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
