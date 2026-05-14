"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClients, getAllProjects, Client, ClientProject } from "@/lib/clients";
import { useTasks } from "@/hooks/useTasks";

export default function DashboardPage() {
  const { tasks, loading } = useTasks();
  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<{ project: ClientProject; client: Client }[]>([]);

  useEffect(() => {
    setClients(getClients());
    setAllProjects(getAllProjects());
  }, []);

  const stats = useMemo(() => {
    const activeTasks = tasks.filter(t => t.state.type === "unstarted" || t.state.type === "started").length;
    const overdueTasks = tasks.filter(t => {
      // dueDate not available
      return false && t.state.type === "unstarted" || t.state.type === "started";
    }).length;
    return { activeTasks, overdueTasks, totalClients: clients.length, totalProjects: allProjects.length };
  }, [tasks, clients, allProjects]);

  const clientProgress = useMemo(() => {
    return clients.map(client => {
      const clientProjs = allProjects.filter(p => p.client.id === client.id);
      const projIds = new Set(clientProjs.map(p => p.project.linearProjectId).filter(Boolean));
      const totalTasks = tasks.filter(t => projIds.has(t.projectId)).length;
      const doneTasks = tasks.filter(t => projIds.has(t.projectId) && (t.state.type === "completed")).length;
      const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
      return { ...client, totalTasks, progress };
    }).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [clients, allProjects, tasks]);

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
          <StatCard icon="groups" label="Clients" value={stats.totalClients.toString()} color="secondary" href="/clients" />
          <StatCard icon="folder" label="Projects" value={stats.totalProjects.toString()} color="tertiary" href="/clients" />
          <StatCard icon="schedule" label="Time Tracking" value="" color="secondary" href="/time-tracking" />
        </div>

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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-md-primary border-r-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-md-on-surface/5 transition-colors cursor-pointer">
                      <Badge variant="primary-tonal">{task.state.name}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-medium font-medium text-md-on-surface truncate">{task.title}</p>
                        <p className="text-body-small text-md-on-surface-variant">{task.assigneeName || "Unassigned"} · {task.projectTitle || "No project"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
