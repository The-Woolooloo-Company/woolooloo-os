"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { XtermTerminal } from "@/components/xterm-terminal";

interface PiProject {
  id: string;
  name: string;
  path: string;
}
interface PiWorkspace {
  id: string;
  projectId: string;
  path: string;
  label: string;
  isMain: boolean;
}

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<"pi" | "terminal">("pi");
  const [projects, setProjects] = useState<PiProject[]>([]);
  const [workspaces, setWorkspaces] = useState<PiWorkspace[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [loading, setLoading] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");

  useEffect(() => {
    fetch("/api/pi-web-proxy/api/projects")
      .then((r) => r.json())
      .then((data: PiProject[]) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0].id);
          loadWorkspaces(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadWorkspaces = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pi-web-proxy/api/projects/${projectId}/workspaces`
      );
      const data: PiWorkspace[] = await res.json();
      setWorkspaces(data);
      const main = data.find((w) => w.isMain) || data[0];
      if (main) {
        setSelectedWorkspace(main.id);
        buildIframeUrl(projectId, main.id);
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  const buildIframeUrl = (pid: string, wid: string) => {
    setIframeSrc(
      `/api/pi-web-proxy?project=${pid}&workspace=${wid}`
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <Navbar />
      <div className="h-[calc(100vh-64px)] flex flex-col pt-[64px]">
        <div className="h-12 border-b border-white/10 flex items-center gap-3 px-4 bg-[#0c0c0e] shrink-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
            Project
          </span>
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              loadWorkspaces(e.target.value);
            }}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-200 outline-none focus:border-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium ml-2">
            Workspace
          </span>
          <select
            value={selectedWorkspace}
            onChange={(e) => buildIframeUrl(selectedProject, e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-200 outline-none focus:border-blue-500"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label || w.path}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setActiveTab("pi")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "pi"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pi Web
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === "terminal"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Terminal
            </button>
            {loading && <Badge variant="secondary">Loading...</Badge>}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-[#1e1e2e]">
          {activeTab === "pi" && iframeSrc && (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="w-full h-full border-0"
              allow="clipboard-read; clipboard-write"
            />
          )}
          {activeTab === "pi" && !iframeSrc && (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              Select a project to start
            </div>
          )}
          {activeTab === "terminal" && <XtermTerminal />}
        </div>
      </div>
    </div>
  );
}
