"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { formatDurationSeconds } from "@/lib/utils";

export default function TimeTrackingPage() {
  const {
    entries,
    users,
    projects,
    totals,
    loading,
    error,
    selectedClientId,
    selectedUserId,
    selectedProjectId,
    setSelectedClientId,
    setSelectedUserId,
    setSelectedProjectId,
  } = useTimeTracking();

  const [viewMode, setViewMode] = useState<"list" | "user" | "project">("list");
  const [search, setSearch] = useState("");

  const filtered = entries.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.userName.toLowerCase().includes(search.toLowerCase()) ||
    e.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Time Tracking</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Track and manage team time entries from Clockify
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="schedule" label="Total Hours" value={`${totals.totalHours.toFixed(1)}h`} color="primary" />
          <StatCard icon="payments" label="Billable" value={`R${(totals.totalAmount / 1000).toFixed(1)}K`} color="success" />
          <StatCard icon="fact_check" label="Entries" value={`${filtered.length}`} color="info" />
          <StatCard icon="groups" label="Team" value={`${users.length}`} color="warning" />
        </div>

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
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      <Badge variant="primary-tonal">{entry.projectName}</Badge>
                      <Badge variant="secondary-tonal">{formatDurationSeconds(entry.duration)}</Badge>
                      {entry.billable && (
                        <Badge variant="success-tonal">R{(entry.billableAmount / 1000).toFixed(1)}K</Badge>
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
