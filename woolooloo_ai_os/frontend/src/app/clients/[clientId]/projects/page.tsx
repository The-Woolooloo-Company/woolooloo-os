"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { AgentDispatchModal } from "@/components/agent-dispatch-modal";
import {
  Client,
  ClientProject,
  getClientById,
  updateProject as updateProjectData,
  addProject as addProjectData,
  deleteProject as deleteProjectData,
} from "@/lib/clients";
import { useExternalProjects } from "@/hooks/useExternalProjects";

export default function ClientProjectsPage() {
  const { clientId } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAgentDispatch, setShowAgentDispatch] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const {
    linearProjects,
    clockifyProjects,
    linearTasks,
    clockifyEntries,
  } = useExternalProjects();

  useEffect(() => {
    if (!clientId) return;
    const c = getClientById(clientId as string);
    if (!c) {
      showToast("Client not found", "error");
      router.push("/clients");
      return;
    }
    setClient(c);
    setLoading(false);
  }, [clientId]);

  const totalTasks = useMemo(() => {
    if (!client) return 0;
    const linearIds = client.projects.map(p => p.linearProjectId).filter((id): id is string => !!id);
    return linearIds.length ? linearTasks.filter(t => linearIds.includes(t.projectId)).length : 0;
  }, [client, linearTasks]);

  const totalHours = useMemo(() => {
    if (!client) return 0;
    const clockifyIds = [...new Set(client.projects.map(p => p.clockifyProjectId).filter((id): id is string => !!id))];
    if (!clockifyIds.length) return 0;
    // Deduplicate: if multiple projects share a Clockify ID, count entries only once
    const uniqueEntries = new Map(clockifyEntries.filter(e => clockifyIds.includes(e.projectId)).map((e: any) => [e.id, e]));
    return Array.from(uniqueEntries.values()).reduce((s: number, e: any) => s + e.duration / 3600, 0);
  }, [client, clockifyEntries]);

  const refresh = () => {
    if (!client) return;
    setClient(getClientById(clientId as string));
  };

  const handleAddProject = () => {
    if (!client || !projectName.trim()) return;
    addProjectData(client.id, {
      name: projectName.trim(),
      description: projectDesc.trim() || undefined,
      agentsEnabled: true,
      integrations: [],
    });
    setShowProjectModal(false);
    setProjectName("");
    setProjectDesc("");
    showToast(`Project "${projectName.trim()}" added`, "success");
    refresh();
  };

  const handleDeleteProject = (projectId: string, name: string) => {
    if (!client || !confirm(`Delete project "${name}"?`)) return;
    deleteProjectData(client.id, projectId);
    showToast(`Project "${name}" deleted`, "success");
    refresh();
  };

  const handleToggleAgents = (projectId: string) => {
    if (!client) return;
    const project = client.projects.find(p => p.id === projectId);
    if (!project) return;
    updateProjectData(client.id, projectId, { agentsEnabled: !project.agentsEnabled });
    refresh();
  };

  const handleMapLinear = (projectId: string, value: string) => {
    if (!client) return;
    updateProjectData(client.id, projectId, { linearProjectId: value || undefined });
    refresh();
    showToast(value ? "Linear mapped" : "Mapping cleared", "success");
  };

  const handleMapClockify = (projectId: string, value: string) => {
    if (!client) return;
    updateProjectData(client.id, projectId, { clockifyProjectId: value || undefined });
    refresh();
    showToast(value ? "Clockify mapped" : "Mapping cleared", "success");
  };

  if (!client || loading) {
    return (
      <div className="min-h-screen bg-md-surface flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/clients" className="text-label-medium text-md-primary hover:underline inline-flex items-center gap-1">
            <span className="material-symbols-rounded text-18">arrow_back</span>
            Clients
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-md-primary-container flex items-center justify-center">
              <span className="material-symbols-rounded text-32 text-md-on-primary-container">folder</span>
            </div>
            <div>
              <h1 className="text-display-small text-md-on-surface">{client.name}</h1>
              <p className="text-body-large text-md-on-surface-variant">Projects</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="tonal" onClick={() => setShowAgentDispatch(true)}>
              <span className="material-symbols-rounded text-18 mr-1">smart_toy</span>
              @Agent
            </Button>
            <Button variant="filled" onClick={() => setShowProjectModal(true)}>
              <span className="material-symbols-rounded text-18 mr-1">add</span>
              Add Project
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="folder" label="Projects" value={client.projects.length.toString()} color="primary" />
          <StatCard icon="checklist" label="Tasks" value={totalTasks.toString()} color="secondary" />
          <StatCard icon="schedule" label="Hours" value={`${totalHours.toFixed(1)}h`} color="tertiary" />
          <StatCard icon="settings" label="AI Enabled" value={client.projects.filter(p => p.agentsEnabled).length.toString()} color="info" />
        </div>

        {/* Projects Grid */}
        {client.projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <span className="material-symbols-rounded text-64 text-md-on-surface-variant/30 block mb-4">folder</span>
              <p className="text-body-large text-md-on-surface-variant">No projects yet. Add your first project.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {client.projects.map((project) => (
              <ProjectCard
                key={project.id}
                client={client}
                project={project}
                linearProjects={linearProjects}
                clockifyProjects={clockifyProjects}
                linearTasks={linearTasks}
                clockifyEntries={clockifyEntries}
                onDelete={() => handleDeleteProject(project.id, project.name)}
                onToggleAgents={() => handleToggleAgents(project.id)}
                onMapLinear={(v) => handleMapLinear(project.id, v)}
                onMapClockify={(v) => handleMapClockify(project.id, v)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Project Modal */}
      {showProjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowProjectModal(false)}
        >
          <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="material-symbols-rounded text-24">add</span>
                Add Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Project Name *"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Website Redesign"
                autoFocus
              />
              <Textarea
                label="Description"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Brief description..."
              />
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="text" onClick={() => setShowProjectModal(false)}>Cancel</Button>
                <Button variant="filled" onClick={handleAddProject} disabled={!projectName.trim()}>
                  <span className="material-symbols-rounded text-18 mr-1">add</span>
                  Add Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Dispatch Modal */}
      {showAgentDispatch && (
        <AgentDispatchModal
          projects={client.projects.map(p => ({ id: p.id, name: p.name }))}
          onClose={() => setShowAgentDispatch(false)}
          onDispatch={() => showToast("Agent dispatched!", "success")}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

interface StatCardProps { icon: string; label: string; value: string; color: "primary" | "secondary" | "tertiary" | "error" | "info"; }
function StatCard({ icon, label, value, color }: StatCardProps) {
  const bgMap: Record<string, string> = {
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
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md-1 ${bgMap[color]}`}>
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

interface ProjectCardProps {
  client: Client;
  project: ClientProject;
  linearProjects: { id: string; key: string; title: string }[];
  clockifyProjects: { id: string; name: string }[];
  linearTasks: any[];
  clockifyEntries: any[];
  onDelete: () => void;
  onToggleAgents: () => void;
  onMapLinear: (v: string) => void;
  onMapClockify: (v: string) => void;
}

function ProjectCard({
  client, project, linearProjects, clockifyProjects, linearTasks, clockifyEntries,
  onDelete, onToggleAgents, onMapLinear, onMapClockify,
}: ProjectCardProps) {
  const linearId = project.linearProjectId || "";
  const clockifyId = project.clockifyProjectId || "";
  const mappedLinear = linearProjects.find(p => p.id === linearId);
  const projTasks = linearTasks.filter(t => t.projectId === linearId);
  let projEntries = clockifyEntries.filter(e => e.projectId === clockifyId);
  // andrewq only works on WoolsApp, filter his entries from Woolooloo OS
  if (project.id === 'woolooloo-os') {
    projEntries = projEntries.filter((e: any) => e.userName?.toLowerCase() !== 'andrewq');
  }
  const projHours = projEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0);

  return (
    <Card className="hover:shadow-md-2 transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/clients/${client.id}/projects/${project.id}`}
              className="text-title-large text-md-primary hover:underline inline-flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-24">folder_open</span>
              {project.name}
            </Link>
            {project.description && (
              <p className="text-body-medium text-md-on-surface-variant mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={project.agentsEnabled ? "success-tonal" : "secondary-tonal"}>
              {project.agentsEnabled ? "AI Active" : "AI Off"}
            </Badge>
            <Button variant="text" size="sm" onClick={onDelete} className="text-md-error">
              <span className="material-symbols-rounded text-18">delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-medium text-md-on-surface-variant">Tasks</p>
            <p className="text-title-medium font-medium text-md-on-surface">{projTasks.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-medium text-md-on-surface-variant">Hours</p>
            <p className="text-title-medium font-medium text-md-on-surface">{projHours.toFixed(1)}h</p>
          </div>
          <div className="p-3 rounded-xl bg-md-surface-container/50">
            <p className="text-label-medium text-md-on-surface-variant">GitHub</p>
            <p className="text-title-medium font-medium text-md-on-surface">{project.githubRepos?.length || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-md-surface-container/50 flex items-center justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={project.agentsEnabled}
                onChange={onToggleAgents}
                className="w-4 h-4 rounded accent-[color:var(--color-md-primary)]"
              />
              <span className="text-label-medium text-md-on-surface">AI Agents</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-label-small text-md-on-surface-variant block mb-1">Linear Project</label>
            <select
              className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50"
              value={linearId}
              onChange={(e) => onMapLinear(e.target.value)}
            >
              <option value="">Not mapped</option>
              {linearProjects.map(lp => (
                <option key={lp.id} value={lp.id}>{lp.key}: {lp.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-small text-md-on-surface-variant block mb-1">Clockify Project</label>
            <select
              className="w-full h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50"
              value={clockifyId}
              onChange={(e) => onMapClockify(e.target.value)}
            >
              <option value="">Not mapped</option>
              {clockifyProjects.map(cp => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
