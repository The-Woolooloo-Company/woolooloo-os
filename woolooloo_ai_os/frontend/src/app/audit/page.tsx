"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAgentDispatches, getReviewCheckpoints } from "@/lib/closed-loop";

type AuditType = 'agent' | 'review' | 'task' | 'time' | 'all';

interface AuditEntry {
  id: string; type: AuditType; timestamp: string; title: string; description: string;
  actor?: string; project?: string; severity: 'info' | 'warning' | 'success' | 'error';
}

export default function AuditPage() {
  const [filter, setFilter] = useState<AuditType>('all');
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const allEntries = useMemo<AuditEntry[]>(() => {
    const entries: AuditEntry[] = [];
    for (const d of getAgentDispatches()) {
      entries.push({ id: d.id, type: 'agent', timestamp: d.createdAt, title: `Agent dispatched: ${d.agentId}`, description: d.prompt.substring(0, 100), project: d.projectName, severity: d.status === 'completed' ? 'success' : d.status === 'failed' ? 'error' : 'info' });
    }
    for (const r of getReviewCheckpoints()) {
      entries.push({ id: r.id, type: 'review', timestamp: r.createdAt, title: `Review: ${r.title}`, description: r.description?.substring(0, 100) || '', actor: r.assignee, project: r.projectId, severity: r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'error' : 'warning' });
    }
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
  }, []);

  const filtered = useMemo(() => allEntries.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allEntries, filter, search]);

  useEffect(() => { setLoading(false); }, []);

  const typeIcon = (type: string) => {
    switch (type) { case 'agent': return 'psychology'; case 'review': return 'assignment'; case 'task': return 'checklist'; case 'time': return 'schedule'; default: return 'activity_zone'; }
  };

  const sevBadge: Record<string, string> = {
    success: "success-tonal", error: "error-tonal", warning: "warning-tonal", info: "info-tonal",
  };

  const sevColor: Record<string, string> = {
    success: "bg-success text-on-success", error: "bg-md-error text-on-error",
    warning: "bg-warning text-on-warning", info: "bg-info text-on-info",
  };

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-label-medium text-md-primary hover:underline inline-flex items-center gap-1 mb-4">
            <span className="material-symbols-rounded text-18">arrow_back</span>
            Back to Dashboard
          </Link>
          <h1 className="text-display-small text-md-on-surface">Activity Audit</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Full trace of all system activity
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="activity_zone" label="Total Events" value={allEntries.length.toString()} color="primary" />
          <StatCard icon="psychology" label="Dispatches" value={allEntries.filter(e => e.type === 'agent').length.toString()} color="success" />
          <StatCard icon="assignment" label="Reviews" value={allEntries.filter(e => e.type === 'review').length.toString()} color="tertiary" />
          <StatCard icon="hourglass_top" label="Pending" value={allEntries.filter(e => e.severity === 'warning' || e.severity === 'info').length.toString()} color="error" />
        </div>

        {/* Filters */}
        <Card variant="tonal" className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex gap-1 flex-wrap">
                {(['all', 'agent', 'review', 'task', 'time'] as AuditType[]).map(f => (
                  <button key={f} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-label-medium font-medium transition-all duration-200 min-h-[48px] ${filter === f ? "bg-md-primary text-md-on-primary shadow-md-1" : "bg-md-surface-container/50 text-md-on-surface hover:bg-md-surface-container"}`} onClick={() => setFilter(f)}>
                    <span className="material-symbols-rounded text-16">{typeIcon(f === 'all' ? 'all' : f)}</span>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <Input placeholder="Search activity..." value={search} onChange={e => setSearch(e.target.value)} startIcon={<span className="material-symbols-rounded text-20">search</span>} className="sm:max-w-[280px]" />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">activity_zone</span>
                <p className="text-body-large text-md-on-surface-variant">No activity found</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filtered.map((entry, i) => (
                  <div key={entry.id} className="flex gap-4">
                    {/* Timeline icon */}
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${sevColor[entry.severity]}`}>
                        <span className="material-symbols-rounded text-20">{typeIcon(entry.type)}</span>
                      </div>
                      {i < filtered.length - 1 && <div className="w-0.5 flex-1 bg-md-outline-variant/30 mt-2" />}
                    </div>
                    {/* Card */}
                    <div className="pb-6">
                      <div className="p-4 rounded-xl bg-md-surface-container/50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h6 className="text-label-large text-md-on-surface font-medium">{entry.title}</h6>
                              <Badge variant={sevBadge[entry.severity] as any}>{entry.severity}</Badge>
                            </div>
                            <p className="text-body-medium text-md-on-surface-variant">{entry.description}</p>
                          </div>
                          <span className="text-body-small text-md-on-surface-variant flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {(entry.actor || entry.project) && (
                          <div className="flex gap-2 mt-2">
                            {entry.actor && <Badge variant="secondary-tonal"><span className="material-symbols-rounded text-12 mr-1">person</span>{entry.actor}</Badge>}
                            {entry.project && <Badge variant="primary-tonal"><span className="material-symbols-rounded text-12 mr-1">folder</span>{entry.project}</Badge>}
                          </div>
                        )}
                      </div>
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

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "success" | "tertiary" | "error"; }
function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary", success: "bg-success text-on-success",
    tertiary: "bg-md-tertiary text-md-on-tertiary", error: "bg-md-error text-md-on-error",
  };
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md-1 ${bgMap[color]}`}>
          <span className="material-symbols-rounded text-24">{icon}</span>
        </div>
        <div>
          <p className="text-label-medium text-md-on-surface-variant">{label}</p>
          <p className="text-headline-medium font-medium text-md-on-surface">{value}</p>
        </div>
      </div>
    </CardContent></Card>
  );
}
