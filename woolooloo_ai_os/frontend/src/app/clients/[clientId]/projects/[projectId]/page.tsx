"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { getConfig } from "@/lib/config-store";

type TabId = "tasks" | "time" | "people" | "activity" | "integrations";

interface ProjectIntegration {
  type: "github" | "bitbucket" | "jira" | "confluence" | "linear" | "clockify";
  connected: boolean;
  label: string;
  icon: string;
  mirrorUrl?: string;
  lastSync?: string;
}

export default function ProjectDetailPage() {
  const { clientId, projectId } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [project, setProject] = useState<ClientProject | null>(null);
  const [showAgentDispatch, setShowAgentDispatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [githubCommits, setGithubCommits] = useState<any[]>([]);

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

    // Auto-fetch GitHub commits on load
    if (p.githubRepos && p.githubRepos.length > 0) {
      fetch(`/api/github/commits?repos=${encodeURIComponent(p.githubRepos.join(','))}&days=30`)
        .then(r => r.json())
        .then(data => setGithubCommits(data.commits || []))
        .catch(err => console.warn('[Project] Failed to fetch commits:', err));
    }
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
    let entries = clockifyEntries.filter((e: any) => e.projectId === project.clockifyProjectId);
    // Filter out andrewq's entries on Woolooloo OS (he works on WoolsApp, not Woolooloo OS)
    if (project.id === 'woolooloo-os') {
      entries = entries.filter((e: any) => e.userName?.toLowerCase() !== 'andrewq');
    }
    return entries;
  }, [project, clockifyEntries]);

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    let entries = projectEntries;
    if (dateFrom) entries = entries.filter((e: any) => e.start >= dateFrom);
    if (dateTo) entries = entries.filter((e: any) => e.start <= dateTo + "T23:59:59");
    return entries;
  }, [projectEntries, dateFrom, dateTo]);

  // Sync handler
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const [clockifyRes, githubRes] = await Promise.all([
        fetch("/api/clockify?type=all"),
        project?.githubRepos
          ? fetch(`/api/github/commits?repos=${encodeURIComponent(project.githubRepos.join(','))}&days=30`)
          : Promise.resolve(null),
      ]);
      const data = await clockifyRes.json();
      const entries = (data.timeEntries || []).filter((e: any) =>
        e.projectId === project?.clockifyProjectId
      );
      const tasks = (data.linearTasks || []).filter((t: any) =>
        t.projectId === project?.linearProjectId
      );
      let commitCount = 0;
      if (githubRes) {
        const ghData = await githubRes.json();
        setGithubCommits(ghData.commits || []);
        commitCount = (ghData.commits || []).length;
      }
      setLastSyncTime(new Date().toLocaleTimeString());
      showToast(`Synced ${tasks.length} tasks, ${entries.length} time entries, ${commitCount} commits`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  }, [project, showToast]);

  const totalHours = useMemo(() =>
    filteredEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0),
    [filteredEntries]
  );

  const totalAmount = useMemo(() =>
    filteredEntries.reduce((s: number, e: any) => {
      if (!e.billable) return s;
      return s + (e.duration / 3600) * e.billableRate;
    }, 0),
    [filteredEntries]
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
    filteredEntries.forEach((e: any) => {
      const name = e.userName || "Unknown";
      const existing = map.get(name) || { name, hours: 0 };
      existing.hours += e.duration / 3600;
      map.set(name, existing);
    });
    return Array.from(map.values());
  }, [filteredEntries]);

  const progress = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0;

  // Activity log
  const activityLog = useMemo(() => {
    const items: Array<{ type: "task" | "time" | "commit"; date: Date; task?: LinearTask; entry?: any; commit?: any }> = [];
    projectTasks.forEach((t: LinearTask) => {
      items.push({
        type: "task",
        date: new Date(Math.max(new Date(t.createdAt).getTime(), new Date(t.updatedAt).getTime())),
        task: t,
      });
    });
    filteredEntries.forEach((e: any) => {
      items.push({ type: "time", date: new Date(e.start), entry: e });
    });
    githubCommits.forEach((c: any) => {
      items.push({ type: "commit", date: new Date(c.commit_date), commit: c });
    });
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [projectTasks, filteredEntries, githubCommits]);

  // Integrations
  const projectIntegrations: ProjectIntegration[] = useMemo(() => {
    const config = getConfig();
    return [
      { type: "linear", connected: !!project?.linearProjectId, label: "Linear", icon: "devices", lastSync: lastSyncTime || undefined },
      { type: "clockify", connected: !!project?.clockifyProjectId, label: "Clockify", icon: "schedule", lastSync: lastSyncTime || undefined },
      { type: "github", connected: !!config.GITHUB_TOKEN || !!config.GITHUB_REPO, label: "GitHub", icon: "code", mirrorUrl: config.GITHUB_REPO ? `https://github.com/${config.GITHUB_REPO}` : undefined },
      { type: "bitbucket", connected: !!config.BITBUCKET_APP_KEY, label: "Bitbucket", icon: "cloud" },
      { type: "jira", connected: !!config.JIRA_API_TOKEN || !!config.JIRA_DOMAIN, label: "Jira", icon: "bug_report", mirrorUrl: config.JIRA_DOMAIN || undefined },
      { type: "confluence", connected: !!config.CONFLUENCE_API_TOKEN || !!config.CONFLUENCE_DOMAIN, label: "Confluence", icon: "article", mirrorUrl: config.CONFLUENCE_DOMAIN || undefined },
    ];
  }, [project, getConfig(), lastSyncTime]);

  if (!client || !project || loading) {
    return (
      <div className="min-h-screen bg-md-surface flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: string; count: number }[] = [
    { id: "tasks", label: "Tasks", icon: "checklist", count: projectTasks.length },
    { id: "time", label: "Time", icon: "schedule", count: filteredEntries.length },
    { id: "people", label: "People", icon: "diversity_3", count: assignees.length + timeUsers.length },
    { id: "activity", label: "Activity", icon: "timeline", count: activityLog.length },
    { id: "integrations", label: "Integrations", icon: "link", count: projectIntegrations.filter(i => i.connected).length },
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
          <div className="flex gap-2">
            <Button variant="tonal" onClick={handleSync} disabled={syncing}>
              <span className={`material-symbols-rounded text-18 mr-1 ${syncing ? "animate-spin" : ""}`}>sync</span>
              {syncing ? "Syncing..." : "Sync"}
            </Button>
            {lastSyncTime && <span className="text-body-small text-md-on-surface-variant self-center">{lastSyncTime}</span>}
            <Button variant="tonal" onClick={() => setShowAgentDispatch(true)}>
              <span className="material-symbols-rounded text-18 mr-1">psychology</span>
              @Agent
            </Button>
          </div>
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
              <div className="h-full rounded-full bg-md-primary transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
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
                {/* Date Filter */}
                <div className="flex items-center gap-3 px-6 py-3 border-b border-md-outline-variant/50 bg-md-surface-container/30">
                  <span className="material-symbols-rounded text-20 text-md-on-surface-variant">filter_alt</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-body-medium text-md-on-surface-variant">From:</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="rounded-lg border border-md-outline-variant bg-transparent px-3 py-1.5 text-md-on-surface text-body-medium focus:outline-none focus:border-md-primary min-h-[36px]"
                    />
                    <label className="text-body-medium text-md-on-surface-variant">To:</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="rounded-lg border border-md-outline-variant bg-transparent px-3 py-1.5 text-md-on-surface text-body-medium focus:outline-none focus:border-md-primary min-h-[36px]"
                    />
                    {(dateFrom || dateTo) && (
                      <Button variant="text" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                        <span className="material-symbols-rounded text-18">close</span>
                        Clear
                      </Button>
                    )}
                    <span className="text-body-small text-md-on-surface-variant">
                      {filteredEntries.length} of {projectEntries.length} entries
                    </span>
                  </div>
                </div>

                {filteredEntries.length === 0 ? (
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
                        {filteredEntries.map((entry: any) => (
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

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div>
                {activityLog.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">timeline</span>
                    <p className="text-body-large text-md-on-surface-variant">No activity logged yet</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="relative">
                      <div className="absolute left-[19px] top-4 bottom-4 w-px bg-md-outline-variant/50" />
                      <div className="space-y-2">
                        {activityLog.map((item, idx) => (
                          <ActivityItem key={`${item.type}-${idx}`} item={item} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectIntegrations.map((integration) => (
                    <IntegrationCard key={integration.type} integration={integration} />
                  ))}
                </div>
              </div>
            )}

            {/* People Tab */}
            {activeTab === "people" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-md-outline-variant/50">
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

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: "primary" | "secondary" | "tertiary" | "error" | "info" }) {
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

function ActivityItem({ item }: { item: { type: "task" | "time" | "commit"; date: Date; task?: LinearTask; entry?: any; commit?: any } }) {
  const isTask = item.type === "task";
  const isCommit = item.type === "commit";
  const timeStr = item.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = item.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="flex items-start gap-3 relative">
      <div className={`relative z-10 flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
        isTask ? "bg-md-primary/10 text-md-primary" :
        isCommit ? "bg-md-secondary/10 text-md-secondary" :
        "bg-md-tertiary/10 text-md-tertiary"
      }`}>
        <span className="material-symbols-rounded text-20">{isTask ? "check" : isCommit ? "code" : "schedule"}</span>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isTask && item.task && (
            <>
              <Badge variant="primary-tonal">Linear</Badge>
              <span className="text-body-medium text-md-primary font-medium">{item.task.projectKey}</span>
              <span className="text-body-medium text-md-on-surface">{item.task.title}</span>
            </>
          )}
          {item.type === "time" && item.entry && (
            <>
              <Badge variant="tertiary-tonal">Time</Badge>
              <span className="text-body-medium text-md-on-surface">{item.entry.description || "Time entry"}</span>
              <span className="text-body-small text-md-on-surface-variant">by {item.entry.userName}</span>
            </>
          )}
          {isCommit && item.commit && (
            <>
              <Badge variant="secondary-tonal">Commit</Badge>
              <span className="text-body-medium text-md-secondary font-mono text-body-small">{item.commit.shortSha}</span>
              <a href={item.commit.html_url} target="_blank" rel="noreferrer" className="text-body-medium text-md-secondary hover:underline truncate max-w-md">
                {item.commit.message}
              </a>
              <span className="text-body-small text-md-on-surface-variant">{item.commit.author} · {item.commit.repo}</span>
            </>
          )}
        </div>
        <p className="text-body-small text-md-on-surface-variant mt-0.5">{dateStr} at {timeStr}</p>
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: ProjectIntegration }) {
  const colors: Record<string, string> = {
    linear: "bg-md-primary/10 text-md-primary",
    clockify: "bg-md-tertiary/10 text-md-tertiary",
    github: "bg-md-secondary/10 text-md-secondary",
    bitbucket: "bg-md-surface-variant/10 text-md-on-surface-variant",
    jira: "bg-info/10 text-info",
    confluence: "bg-warning/10 text-warning",
  };
  const color = colors[integration.type] || "bg-md-surface-variant/10 text-md-on-surface-variant";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color}`}>
            <span className="material-symbols-rounded text-24">{integration.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-title-large text-md-on-surface">{integration.label}</h3>
              <Badge variant={integration.connected ? "success-tonal" : "secondary-tonal"}>
                {integration.connected ? "Connected" : "Not configured"}
              </Badge>
            </div>
            {integration.connected && integration.mirrorUrl && (
              <a href={integration.mirrorUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-body-medium text-md-primary hover:underline">
                <span className="material-symbols-rounded text-16">open_in_new</span>
                Open {integration.label}
              </a>
            )}
            {integration.lastSync && (
              <p className="text-body-small text-md-on-surface-variant mt-1">Last synced: {integration.lastSync}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
