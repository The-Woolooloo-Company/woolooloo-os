"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClients, getAllProjects, Client, ClientProject } from "@/lib/clients";
import { useTasks } from "@/hooks/useTasks";
import { useExternalProjects } from "@/hooks/useExternalProjects";
import { formatDuration } from "@/lib/clockify";

export default function DashboardPage() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { clockifyEntries, linearTasks } = useExternalProjects();
  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<{ project: ClientProject; client: Client }[]>([]);

  useEffect(() => {
    setClients(getClients());
    setAllProjects(getAllProjects());
  }, []);

  const stats = useMemo(() => {
    const activeTasks = linearTasks.filter(t => t.state?.type === "unstarted" || t.state?.type === "started").length;
    const totalHours = clockifyEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0);
    return { activeTasks, totalHours: totalHours.toFixed(1) + "h", totalClients: clients.length, totalProjects: allProjects.length };
  }, [linearTasks, clockifyEntries, clients, allProjects]);

  const projectSummary = useMemo(() => {
    return allProjects.map(({ project, client }) => {
      // Linear tasks
      const projTasks = project.linearProjectId
        ? linearTasks.filter(t => t.projectId === project.linearProjectId)
        : [];
      const activeCount = projTasks.filter(t => t.state?.type !== "completed").length;
      const doneCount = projTasks.filter(t => t.state?.type === "completed").length;

      // Clockify entries
      const projEntries = project.clockifyProjectId
        ? clockifyEntries.filter(e => e.projectId === project.clockifyProjectId)
        : [];
      // andrewq entries belong to WoolsApp only
      const filteredEntries = project.id === 'woolooloo-os'
        ? projEntries.filter((e: any) => e.userName?.toLowerCase() !== 'andrewq')
        : projEntries;
      const hours = filteredEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0);
      const amount = filteredEntries.reduce((s: number, e: any) => {
        if (!e.billable) return s;
        return s + (e.duration / 3600) * e.billableRate;
      }, 0);

      return {
        project,
        client,
        taskCount: activeCount,
        doneCount,
        hours,
        amount,
        entryCount: filteredEntries.length,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [allProjects, linearTasks, clockifyEntries]);

  const clientProgress = useMemo(() => {
    return clients.map(client => {
      const clientProjs = allProjects.filter(p => p.client.id === client.id);
      const projIds = new Set(clientProjs.map(p => p.project.linearProjectId).filter(Boolean));
      const totalTasks = linearTasks.filter(t => projIds.has(t.projectId)).length;
      const doneTasks = linearTasks.filter(t => projIds.has(t.projectId) && (t.state?.type === "completed")).length;
      const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
      return { ...client, totalTasks, progress };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [clients, allProjects, linearTasks]);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-display-small text-md-on-surface">Dashboard</h1>
          <p className="text-body-large text-md-on-surface-variant">AI Operations Center</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="checklist" label="Active Tasks" value={stats.activeTasks.toString()} color="primary" href="/tasks" />
          <StatCard icon="schedule" label="Total Hours" value={stats.totalHours} color="secondary" href="/time-tracking" />
          <StatCard icon="groups" label="Clients" value={stats.totalClients.toString()} color="tertiary" href="/clients" />
          <StatCard icon="folder" label="Projects" value={stats.totalProjects.toString()} color="secondary" href="/clients" />
        </div>

        {/* Project Summary */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>Tasks, hours & revenue per project</CardDescription>
              </div>
              <Link href="/clients">
                <Button variant="text" size="sm">View all <span className="material-symbols-rounded text-18 ml-1">arrow_forward</span></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-md-outline-variant/50">
                    <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Project</th>
                    <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Client</th>
                    <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Tasks</th>
                    <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Hours</th>
                    <th className="text-center py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Entries</th>
                    <th className="text-right py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummary.map(ps => (
                    <tr key={ps.project.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/clients/${ps.client.id}/projects/${ps.project.id}`} className="text-body-medium text-md-primary hover:underline">
                          {ps.project.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-body-medium text-md-on-surface-variant">{ps.client.name}</td>
                      <td className="py-3 px-4 text-center text-body-medium text-md-on-surface">
                        <span className="text-md-secondary">{ps.taskCount}</span><span className="text-md-on-surface-variant">/{ps.taskCount + ps.doneCount}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-body-medium text-md-on-surface">{ps.hours.toFixed(1)}h</td>
                      <td className="py-3 px-4 text-center text-body-medium text-md-on-surface-variant">{ps.entryCount}</td>
                      <td className="py-3 px-4 text-right text-body-medium text-md-on-surface">R{ps.amount.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Tasks</CardTitle>
                  <CardDescription>Latest active tasks</CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="text" size="sm">View all <span className="material-symbols-rounded text-18 ml-1">arrow_forward</span></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linearTasks.filter(t => t.state?.type !== "completed").slice(0, 8).map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-md-on-surface/5 transition-colors cursor-pointer">
                    <Badge variant="primary-tonal">{task.state?.name || "Unknown"}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-medium font-medium text-md-on-surface truncate">{task.title}</p>
                      <p className="text-body-small text-md-on-surface-variant">{task.assigneeName || "Unassigned"} · {task.projectTitle || "No project"}</p>
                    </div>
                  </div>
                ))}
                {linearTasks.filter(t => t.state?.type !== "completed").length === 0 && (
                  <p className="text-center text-body-medium text-md-on-surface-variant py-8">No active tasks</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientProgress.map(client => (
                  <div key={client.id}>
                    <div className="flex items-center justify-between mb-1">
                      <Link href={`/clients/${client.id}`} className="text-label-large font-medium text-md-on-surface hover:underline">{client.name}</Link>
                      <span className="text-body-small text-md-on-surface-variant">{client.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-md-surface-variant overflow-hidden">
                      <div className="h-full rounded-full bg-md-primary transition-all duration-300" style={{ width: `${client.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "secondary" | "tertiary" | "error"; href: string; }
function StatCard({ icon, label, value, color, href }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary",
    secondary: "bg-md-secondary text-md-on-secondary",
    tertiary: "bg-md-tertiary text-md-on-tertiary",
    error: "bg-md-error text-md-on-error",
  };
  return (
    <Link href={href}>
      <Card className="hover:shadow-md-2 transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md-1 ${colorMap[color]}`}>
              <span className="material-symbols-rounded text-24">{icon}</span>
            </div>
            <div>
              <p className="text-label-medium text-md-on-surface-variant">{label}</p>
              <p className="text-headline-medium font-medium text-md-on-surface">{value || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
