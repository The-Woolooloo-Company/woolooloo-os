"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { AgentDispatchModal } from "@/components/agent-dispatch-modal";
import { getClientById, ClientProject } from "@/lib/clients";
import { useExternalProjects } from "@/hooks/useExternalProjects";
import { getPriorityLabel, getPriorityColor, getStatusColor, LinearTask } from "@/lib/linear";
import { formatDuration } from "@/lib/clockify";

type TabId = "tasks" | "time" | "people";

export default function ProjectDetailPage() {
  const { clientId, projectId } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [project, setProject] = useState<ClientProject | null>(null);
  const [showAgentDispatch, setShowAgentDispatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("tasks");

  const { linearTasks, clockifyEntries } = useExternalProjects();

  useEffect(() => {
    if (!clientId || !projectId) return;
    const c = getClientById(clientId as string);
    if (!c) {
      showToast("Client not found", "error");
      router.push("/clients");
      return;
    }
    setClient(c);
    const p = c.projects.find((pr: ClientProject) => pr.id === projectId);
    if (!p) {
      showToast("Project not found", "error");
      router.push(`/clients/${clientId}/projects`);
      return;
    }
    setProject(p);
    setLoading(false);
  }, [clientId, projectId]);

  // Project-specific data
  const projectTasks = useMemo(() => {
    if (!project?.linearProjectId) return linearTasks;
    return linearTasks.filter((t: LinearTask) => t.projectId === project.linearProjectId);
  }, [project, linearTasks]);

  const completedTasks = useMemo(() =>
    projectTasks.filter((t: LinearTask) => t.state.type === "completed"),
    [projectTasks]
  );

  const activeTasks = useMemo(() =>
    projectTasks.filter((t: LinearTask) => t.state.type !== "completed"),
    [projectTasks]
  );

  const projectEntries = useMemo(() => {
    if (!project?.clockifyProjectId) return clockifyEntries;
    return clockifyEntries.filter((e: any) => e.projectId === project.clockifyProjectId);
  }, [project, clockifyEntries]);

  const totalHours = useMemo(() =>
    projectEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0),
    [projectEntries]
  );

  const totalAmount = useMemo(() =>
    projectEntries.reduce((s: number, e: any) => {
      if (!e.billable) return s;
      return s + (e.duration / 3600) * e.billableRate;
    }, 0),
    [projectEntries]
  );

  const assignees = useMemo(() => {
    const map = new Map<string, { name: string; taskCount: number }>();
    projectTasks.forEach((t: LinearTask) => {
      const name = t.assigneeName || "Unassigned";
      const existing = map.get(name) || { name, taskCount: 0 };
      existing.taskCount++;
      map.set(name, existing);
    });
    return Array.from(map.values());
  }, [projectTasks]);

  const timeUsers = useMemo(() => {
    const map = new Map<string, { name: string; hours: number }>();
    projectEntries.forEach((e: any) => {
      const name = e.userName || "Unknown";
      const existing = map.get(name) || { name, hours: 0 };
      existing.hours += e.duration / 3600;
      map.set(name, existing);
    });
    return Array.from(map.values());
  }, [projectEntries]);

  const progress = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0;

  if (!client || !project || loading) {
    return (
      <div className="min-h-screen bg-md-surface flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: string; count: number }[] = [
    { id: "tasks", label: "Tasks", icon: "checklist", count: projectTasks.length },
    { id: "time", label: "Time", icon: "schedule", count: projectEntries.length },
    { id: "people", label: "People", icon: "diversity_3", count: assignees.length + timeUsers.length },
  ];

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-label-medium">
          <Link href="/clients" className="text-md-on-surface-variant hover:text-md-on-surface">Clients</Link>
          <span className="material-symbols-rounded text-16 text-md-on-surface-variant">chevron_right</span>
          <Link href={`/clients/${client.id}`} className="text-md-on-surface-variant hover:text-md-on-surface">{client.name}</Link>
          <span className="material-symbols-rounded text-16 text-md-on-surface-variant">chevron_right</span>
          <span className="text-md-on-surface">{project.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-md-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-32 text-md-on-primary">folder_open</span>
            </div>
            <div>
              <h1 className="text-display-small text-md-on-surface">{project.name}</h1>
              <p className="text-body-large text-md-on-surface-variant">{project.description || `${client.name} project`}</p>
            </div>
          </div>
          <Button variant="tonal" onClick={() => setShowAgentDispatch(true)}>
            <span className="material-symbols-rounded text-18 mr-1">smart_toy</span>
            @Agent
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="trending_up" label="Progress" value={`${progress}%`} color="primary" />
          <StatCard icon="checklist" label="Tasks" value={`${activeTasks.length}/${projectTasks.length}`} color="secondary" />
          <StatCard icon="schedule" label="Hours" value={`${totalHours.toFixed(1)}h`} color="tertiary" />
          <StatCard icon="payments" label="Revenue" value={`R${totalAmount.toFixed(0)}`} color="info" />
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-medium text-md-on-surface-variant">Completion</span>
              <span className="text-label-medium text-md-on-surface-variant">{completedTasks.length} of {projectTasks.length} tasks done</span>
            </div>
            <div className="h-2 rounded-full bg-md-surface-variant overflow-hidden">
              <div
                className="h-full rounded-full bg-md-primary transition-all duration-500 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-md-surface-container/50 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-large font-medium transition-all duration-200 min-h-[48px] ${
                activeTab === tab.id
                  ? "bg-md-primary text-md-on-primary shadow-md-1"
                  : "text-md-on-surface hover:bg-md-on-surface/5"
              }`}
            >
              <span className="material-symbols-rounded text-18">{tab.icon}</span>
              {tab.label}
              <Badge variant={activeTab === tab.id ? "primary" : "primary-tonal"}>{tab.count}</Badge>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <Card>
          <CardContent className="p-0">
            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <>
                {projectTasks.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">checklist</span>
                    <p className="text-body-large text-md-on-surface-variant">
                      {project.linearProjectId ? "No tasks in Linear yet for this project" : "Map a Linear project to see tasks"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-md-outline-variant/50">
                          <th className="text-left py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Task</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Assignee</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Priority</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Status</th>
                          <th className="text-right py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTasks.map((task: LinearTask) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Completed section */}
                {completedTasks.length > 0 && (
                  <div className="border-t border-md-outline-variant/50">
                    <div className="px-6 py-3 bg-md-surface-container/50">
                      <span className="text-label-medium text-md-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-rounded text-18">check_circle</span>
                        Completed History ({completedTasks.length})
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody>
                          {completedTasks.map((task: LinearTask) => (
                            <tr key={task.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors opacity-75">
                              <td className="py-3 px-6">
                                <Link href={`/tasks?linearTaskId=${task.id}`} className="text-body-medium text-md-on-surface-variant hover:underline line-through">
                                  {task.title}
                                </Link>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-body-small text-md-on-surface-variant">{task.assigneeName || "—"}</span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="secondary-tonal">{getPriorityLabel(task.priority)}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="success-tonal">{task.state.name}</Badge>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <a href={`https://linear.app/issue/${task.id}`} target="_blank" rel="noreferrer">
                                  <Button variant="text" size="sm">
                                    <span className="material-symbols-rounded text-18">open_in_new</span>
                                  </Button>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Time Tab */}
            {activeTab === "time" && (
              <>
                {projectEntries.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">schedule</span>
                    <p className="text-body-large text-md-on-surface-variant">
                      {project.clockifyProjectId ? "No time entries for this project" : "Map a Clockify project to see time entries"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-md-outline-variant/50">
                          <th className="text-left py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Date</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Description</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">User</th>
                          <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Duration</th>
                          <th className="text-right py-4 px-6 text-label-medium text-md-on-surface-variant font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectEntries.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                            <td className="py-4 px-6">
                              <p className="text-body-medium text-md-on-surface">{new Date(entry.start).toLocaleDateString()}</p>
                              <p className="text-body-small text-md-on-surface-variant">{new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-body-medium text-md-on-surface">{entry.description || "—"}</p>
                            </td>
                            <td className="py-4 px-4">
                              <Link href={`/staff?search=${encodeURIComponent(entry.userName)}`} className="text-body-medium text-md-primary hover:underline">
                                {entry.userName}
                              </Link>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-body-medium text-md-on-surface">{formatDuration(entry.duration)}</span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {entry.billable ? (
                                <Badge variant="success-tonal">R{((entry.duration / 3600) * entry.billableRate).toFixed(2)}</Badge>
                              ) : (
                                <span className="text-body-small text-md-on-surface-variant">Non-billable</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* People Tab */}
            {activeTab === "people" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-md-outline-variant/50">
                {/* Task Assignees */}
                <div className="p-6">
                  <h3 className="text-title-large text-md-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-24 text-md-primary">checklist</span>
                    Task Assignees
                  </h3>
                  {assignees.length === 0 ? (
                    <p className="text-body-medium text-md-on-surface-variant">No assignees yet</p>
                  ) : (
                    <div className="space-y-2">
                      {assignees.map((a, i) => (
                        <Link key={i} href={`/staff?search=${encodeURIComponent(a.name)}`} className="block">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container/50 hover:bg-md-surface-container transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-label-large font-medium">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-label-large text-md-on-surface">{a.name}</span>
                            </div>
                            <Badge variant="primary-tonal">{a.taskCount} tasks</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {/* Time Users */}
                <div className="p-6">
                  <h3 className="text-title-large text-md-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-24 text-md-tertiary">schedule</span>
                    Time Logged
                  </h3>
                  {timeUsers.length === 0 ? (
                    <p className="text-body-medium text-md-on-surface-variant">No time entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {timeUsers.map((u, i) => (
                        <Link key={i} href={`/staff?search=${encodeURIComponent(u.name)}`} className="block">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container/50 hover:bg-md-surface-container transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-md-tertiary-container flex items-center justify-center text-md-on-tertiary-container text-label-large font-medium">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-label-large text-md-on-surface">{u.name}</span>
                            </div>
                            <Badge variant="tertiary-tonal">{u.hours.toFixed(1)}h</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Agent Dispatch Modal */}
      {showAgentDispatch && (
        <AgentDispatchModal
          projects={[{ id: project.id, name: project.name }]}
          onClose={() => setShowAgentDispatch(false)}
          onDispatch={() => showToast("Agent dispatched!", "success")}
        />
      )}
    </div>
  );
}

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "secondary" | "tertiary" | "error" | "info"; }
function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: "bg-md-primary text-md-on-primary",
    secondary: "bg-md-secondary text-md-on-secondary",
    tertiary: "bg-md-tertiary text-md-on-tertiary",
    error: "bg-md-error text-md-on-error",
    info: "bg-info text-on-info",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md-1 ${colorMap[color]}`}>
            <span className="material-symbols-rounded text-24">{icon}</span>
          </div>
          <div>
            <p className="text-label-medium text-md-on-surface-variant">{label}</p>
            <p className="text-headline-medium font-medium text-md-on-surface">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: LinearTask }) {
  return (
    <tr className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
      <td className="py-4 px-6">
        <Link href={`/tasks?linearTaskId=${task.id}`} className="text-body-medium text-md-primary hover:underline font-medium">
          <span className="material-symbols-rounded text-16 align-middle mr-1">drag_indicator</span>
          {task.title}
        </Link>
      </td>
      <td className="py-4 px-4">
        {task.assigneeName ? (
          <Link href="/staff" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-md-primary-container text-md-on-primary-container text-label-small">
            <span className="material-symbols-rounded text-14">person</span>
            {task.assigneeName}
          </Link>
        ) : (
          <span className="text-body-small text-md-on-surface-variant">Unassigned</span>
        )}
      </td>
      <td className="py-4 px-4">
        <Badge variant={getPriorityColor(task.priority) as any}>{getPriorityLabel(task.priority)}</Badge>
      </td>
      <td className="py-4 px-4">
        <Badge variant={getStatusColor(task.state.type) as any}>{task.state.name}</Badge>
      </td>
      <td className="py-4 px-6 text-right">
        <a href={`https://linear.app/issue/${task.id}`} target="_blank" rel="noreferrer">
          <Button variant="text" size="sm">
            <span className="material-symbols-rounded text-18">open_in_new</span>
          </Button>
        </a>
      </td>
    </tr>
  );
}
