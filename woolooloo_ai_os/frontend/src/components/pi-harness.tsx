"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format, intervalToDuration } from "date-fns";
import { getAllProjects, seedMockClients, Client, ClientProject } from "@/lib/clients";

// ─── Types ─────────────────────────────────────────────────────

interface RunningProcess {
  id: string;
  command: string;
  label: string;
  startedAt: number;
  status: "running" | "completed" | "failed";
  output: string[];
  exitCode?: number;
  repo?: string;
}

interface CommandHistory {
  id: string;
  input: string;
  command: string;
  timestamp: number;
  duration?: number;
  status: "success" | "failed" | "pending";
  outputPreview?: string;
  repo?: string;
}

interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
  status: "connected" | "error" | "checking";
  clientId?: string;
  project?: { id: string; name: string };
}

type TabKey = "command" | "processes" | "github";

// ─── Project/Repo selector ─────────────────────────────────────

interface ProjectRepo {
  client: Client;
  project: ClientProject;
  repo: { name: string; path: string };
}

// ─── Pi Harness Component ──────────────────────────────────────

export function PiHarness() {
  const [promptInput, setPromptInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [runningProcesses, setRunningProcesses] = useState<RunningProcess[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("command");
  const [isProcessing, setIsProcessing] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [checkingRepos, setCheckingRepos] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Project/Repo selection state ───────────────────────────
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  // ─── Load all data on mount ─────────────────────────────────
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    seedMockClients();
    setDataLoaded(true); // trigger recomputation of projectRepos
    loadGithubRepos();
  }, []);

  // ─── Auto-scroll terminal ───────────────────────────────────
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // ─── Build repos from clients data ──────────────────────────
  const projectRepos = useMemo((): ProjectRepo[] => {
    if (!dataLoaded) return [];
    const projects = getAllProjects();
    const results: ProjectRepo[] = [];
    const seen = new Set<string>();

    for (const { project, client } of projects) {
      const repoNames = project.githubRepos || [];
      for (const repoName of repoNames) {
        const repoShort = repoName.split('/')[1] || repoName;
        // Deduplicate: same repo across projects only shows once
        const dedupKey = `${client.id}::${project.id}::${repoName}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        results.push({
          client,
          project,
          repo: {
            name: repoShort,
            path: `/workspace/${repoShort}`,
          },
        });
      }
    }
    return results;
  }, [dataLoaded]);

  // ─── Group repos by project ─────────────────────────────────
  const reposByProject = useMemo(() => {
    const map = new Map<string, ProjectRepo[]>();
    for (const pr of projectRepos) {
      const key = `${pr.client.id}::${pr.project.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pr);
    }
    return map;
  }, [projectRepos]);

  // ─── Available projects for selected client ─────────────────
  const availableProjects = useMemo(() => {
    if (!selectedClient) return projectRepos.map(pr => ({ client: pr.client, project: pr.project }));
    return projectRepos
      .filter(pr => pr.client.id === selectedClient)
      .map(pr => ({ client: pr.client, project: pr.project }));
  }, [selectedClient, projectRepos]);

  // ─── Available repos for selected project ───────────────────
  const availableRepos = useMemo(() => {
    if (!selectedProject) return [];
    const all = availableProjects.filter(p => p.project.id === selectedProject);
    return all.flatMap(p => projectRepos.filter(pr =>
      pr.client.id === p.client.id && pr.project.id === p.project.id
    ));
  }, [selectedProject, availableProjects, projectRepos]);

  // ─── Unique clients ─────────────────────────────────────────
  const uniqueClients = useMemo(() => {
    const set = new Map<string, Client>();
    for (const pr of projectRepos) {
      if (!set.has(pr.client.id)) set.set(pr.client.id, pr.client);
    }
    return Array.from(set.values());
  }, [projectRepos]);

  // ─── Workspace path for selected repo ───────────────────────
  const currentWorkspace = useMemo(() => {
    if (!selectedRepo) return undefined;
    return projectRepos.find(pr => pr.repo.name === selectedRepo)?.repo.path;
  }, [selectedRepo, projectRepos]);

  // ─── Selected project info ──────────────────────────────────
  const currentProject = useMemo(() => {
    if (!selectedProject) return null;
    return projectRepos.find(pr => pr.project.id === selectedProject);
  }, [selectedProject, projectRepos]);

  // ─── Load GitHub repos ──────────────────────────────────────
  const loadGithubRepos = useCallback(async () => {
    let apiRepos: GithubRepo[] = [];
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        apiRepos = data.repositories || [];
      }
    } catch { /* API might not be configured */ }

    const localRepos = buildReposFromClients();
    const apiNames = new Set(apiRepos.map(r => r.full_name));
    const merged = [
      ...apiRepos,
      ...localRepos.filter(r => !apiNames.has(r.full_name)),
    ];
    setRepos(merged);
  }, []);

  const buildReposFromClients = useCallback((): GithubRepo[] => {
    seedMockClients();
    const projects = getAllProjects();
    const repos: GithubRepo[] = [];
    const seen = new Set<string>();

    for (const { project, client } of projects) {
      if (project.githubRepos) {
        for (const repoName of project.githubRepos) {
          if (seen.has(repoName)) continue;
          seen.add(repoName);
          repos.push({
            name: repoName.split('/')[1] || repoName,
            full_name: repoName,
            html_url: `https://github.com/${repoName}`,
            default_branch: 'main',
            stargazers_count: 0,
            open_issues_count: 0,
            pushed_at: new Date().toISOString(),
            status: 'connected',
            clientId: client.id,
            project: { id: project.id, name: project.name },
          });
        }
      }
    }
    return repos;
  }, []);

  // ─── Check all repos connectivity ────────────────────────────
  const checkAllRepos = useCallback(async () => {
    setCheckingRepos(true);
    const updated = [...repos];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "checking" };
      setRepos([...updated]);
      try {
        const res = await fetch(`/api/github/repos/${updated[i].full_name}`);
        updated[i] = res.ok ? { ...updated[i], status: "connected" } : { ...updated[i], status: "error" };
      } catch {
        updated[i] = { ...updated[i], status: "error" };
      }
      setRepos([...updated]);
    }
    setCheckingRepos(false);
  }, [repos]);

  // ─── Parse natural language prompt to command ───────────────
  const parsePromptToCommand = (prompt: string): string => {
    const p = prompt.toLowerCase().trim();

    // Git commands
    if (p.includes("git status") || p.includes("check status")) return "git status --short";
    if (p.includes("git log") || p.includes("show commits") || p.includes("commit history")) return "git log --oneline -10";
    if (p.includes("git diff") || p.includes("show changes")) return "git diff --stat";
    if (p.includes("git branch")) return "git branch -v";
    if (p.includes("add all") || p.includes("stage all")) return "git add -A";
    if (p.includes("pull") && p.includes("git")) return "git pull --rebase";
    if (p.includes("fetch")) return "git fetch --all --prune";

    // File operations
    if (p.includes("list files") || p.includes("show files") || p.includes("ls")) return "ls -lah";
    if (p.includes("tree") || p.includes("directory structure")) return "tree -L 2 -I node_modules --dirsfirst";
    if (p.includes("find") && p.includes("ts")) return "find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | head -30";
    if (p.includes("find") && p.includes("test")) return "find . -name '*.test.*' -o -name '*.spec.*' | grep -v node_modules | head -20";
    if (p.includes("biggest files") || p.includes("large files")) return "find . -type f -size +1M -exec ls -lh {} \\; | sort -k5 -h -r | head -10";
    if (p.includes("recent") || p.includes("modified")) return "find . -type f -mtime -1 ! -path '*/node_modules/*' | head -20";

    // Build/check
    if (p.includes("build")) return "npm run build 2>&1 || echo 'No build script found'";
    if (p.includes("type check") || p.includes("tsc") || p.includes("typescript")) return "npx tsc --noEmit 2>&1 || echo 'No TypeScript config'";
    if (p.includes("lint") || p.includes("ruff")) return "ruff check . 2>&1 || npx eslint . 2>&1 || echo 'No linter found'";
    if (p.includes("test") && !p.includes("find")) return "npm test 2>&1 || pytest 2>&1 || echo 'No test runner found'";

    // System
    if (p.includes("disk") || p.includes("space")) return "du -sh ./* 2>/dev/null | sort -rh | head -10";
    if (p.includes("process") || p.includes("ps")) return "ps aux --sort=-%mem | head -15";
    if (p.includes("env") || p.includes("environment")) return "env | grep -v 'key\\|secret\\|token\\|password' | sort";
    if (p.includes("node") || p.includes("version") || p.includes("what version")) return "node --version && npm --version && git --version";

    // GitHub
    if (p.includes("remote")) return "git remote -v";
    if (p.includes("origin")) return "git config --get remote.origin.url";

    // Default: treat as raw command
    return prompt;
  };

  // ─── Execute command via API ────────────────────────────────
  const executeCommand = useCallback(async (prompt: string, cwd?: string) => {
    const command = parsePromptToCommand(prompt);
    const processId = `proc_${Date.now()}`;
    const startMs = Date.now();
    const targetCwd = cwd || currentWorkspace;

    const process: RunningProcess = {
      id: processId,
      command,
      label: prompt,
      startedAt: startMs,
      status: "running",
      output: [],
      repo: selectedRepo || undefined,
    };

    setRunningProcesses(prev => [process, ...prev]);
    setIsProcessing(true);
    setTerminalOutput(prev => [...prev, `[${format(new Date(), 'HH:mm:ss')}] ${targetCwd ? `cd ${targetCwd}` : ''} && ${command}`]);

    try {
      const res = await fetch("/api/workspace/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwd: targetCwd }),
      });

      if (!res.ok) {
        const err = await res.json();
        const endMs = Date.now();
        setRunningProcesses(prev => prev.map(p =>
          p.id === processId ? { ...p, status: "failed", output: [...p.output, err.error || "Command failed"] } : p
        ));
        setCommandHistory(prev => [{
          id: `hist_${endMs}`,
          input: prompt,
          command,
          timestamp: endMs,
          duration: endMs - startMs,
          status: "failed",
          outputPreview: err.error || "Command failed",
          repo: selectedRepo || undefined,
        }, ...prev]);
        setTerminalOutput(prev => [...prev, `❌ ${err.error || "Command failed"}`]);
        setIsProcessing(false);
        return;
      }

      // Stream output
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let exitCode = 0;
      let outputLines: string[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          if (rawLine.startsWith('out:')) {
            const content = rawLine.slice(4);
            if (content.trim()) {
              outputLines.push(content);
              setTerminalOutput(prev => [...prev, content]);
              setRunningProcesses(prev => prev.map(p =>
                p.id === processId ? { ...p, output: [...p.output, content] } : p
              ));
            }
          } else if (rawLine.startsWith('err:')) {
            const content = rawLine.slice(4);
            if (content.trim()) {
              outputLines.push(content);
              setTerminalOutput(prev => [...prev, `⚠ ${content}`]);
              setRunningProcesses(prev => prev.map(p =>
                p.id === processId ? { ...p, output: [...p.output, content] } : p
              ));
            }
          } else if (rawLine.startsWith('exit:')) {
            exitCode = parseInt(rawLine.slice(5)) || 0;
          }
        }
      }

      // Handle remaining buffer
      if (buffer) {
        if (buffer.startsWith('out:') || buffer.startsWith('err:')) {
          const content = buffer.slice(4);
          if (content.trim()) outputLines.push(content);
        }
      }

      const endMs = Date.now();
      const duration = endMs - startMs;
      const completed = exitCode === 0;

      setRunningProcesses(prev => prev.map(p =>
        p.id === processId
          ? { ...p, status: completed ? "completed" : "failed", exitCode }
          : p
      ));
      setCommandHistory(prev => [{
        id: `hist_${endMs}`,
        input: prompt,
        command,
        timestamp: endMs,
        duration,
        status: completed ? "success" : "failed",
        outputPreview: outputLines.slice(-3).join("\n") || (completed ? "Completed" : `Exit code ${exitCode}`),
        repo: selectedRepo || undefined,
      }, ...prev]);

      if (completed) {
        setTerminalOutput(prev => [...prev, `✅ Completed in ${duration}ms`]);
      } else {
        setTerminalOutput(prev => [...prev, `❌ Failed with exit code ${exitCode} in ${duration}ms`]);
      }
    } catch (err: any) {
      const endMs = Date.now();
      setRunningProcesses(prev => prev.map(p =>
        p.id === processId ? { ...p, status: "failed", output: [...p.output, err.message] } : p
      ));
      setCommandHistory(prev => [{
        id: `hist_${endMs}`,
        input: prompt,
        command,
        timestamp: endMs,
        duration: endMs - startMs,
        status: "failed",
        outputPreview: err.message,
        repo: selectedRepo || undefined,
      }, ...prev]);
      setTerminalOutput(prev => [...prev, `❌ ${err.message}`]);
    }

    setIsProcessing(false);
    setPromptInput("");
  }, [currentWorkspace, selectedRepo]);

  // ─── Handle keyboard ────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (promptInput.trim() && !isProcessing) {
        executeCommand(promptInput);
      }
    }
  };

  // ─── Active processes ───────────────────────────────────────
  const activeProcesses = useMemo(() =>
    runningProcesses.filter(p => p.status === "running"),
    [runningProcesses]
  );

  const recentProcesses = useMemo(() =>
    runningProcesses.filter(p => p.status !== "running").slice(0, 10),
    [runningProcesses]
  );

  // ─── Format duration ────────────────────────────────────────
  const formatDuration = (ms: number): string => {
    const d = intervalToDuration({ start: 0, end: ms });
    const parts: string[] = [];
    if (d.minutes) parts.push(`${d.minutes}m`);
    if (d.seconds) parts.push(`${d.seconds}s`);
    if (parts.length === 0) parts.push(`${ms}ms`);
    return parts.join(" ");
  };

  // ─── Quick actions ──────────────────────────────────────────
  const quickActions = [
    { label: "Git Status", icon: "visibility", prompt: "check git status" },
    { label: "Commit Log", icon: "history", prompt: "show commit history" },
    { label: "List Files", icon: "folder", prompt: "list files" },
    { label: "Type Check", icon: "code", prompt: "run type check" },
    { label: "Build", icon: "build", prompt: "run build" },
    { label: "Git Diff", icon: "compare_arrows", prompt: "show changes" },
    { label: "Git Pull", icon: "sync", prompt: "git pull" },
    { label: "Remote URL", icon: "cloud", prompt: "show git remote" },
    { label: "Big Files", icon: "stack", prompt: "find biggest files" },
  ];

  // ─── Tabs ───────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "command", label: "Command", icon: "terminal" },
    { key: "processes", label: "Processes", icon: "settings_motion_mode", badge: activeProcesses.length || undefined },
    { key: "github", label: "GitHub", icon: "code", badge: repos.length || undefined },
  ];

  // ─── Select a repo (auto-selects project/client) ────────────
  const selectRepo = (pr: ProjectRepo) => {
    setSelectedClient(pr.client.id);
    setSelectedProject(pr.project.id);
    setSelectedRepo(pr.repo.name);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-rounded text-28" style={{ color: "var(--color-md-primary)" }}>
                api
              </span>
              <span>Pi Harness</span>
              <Badge variant="secondary-tonal" className="text-[10px]">
                AI Command Interface
              </Badge>
            </CardTitle>
            <CardDescription>
              {selectedProject ? (
                <span className="font-medium text-md-primary">
                  {currentProject?.client.name} → {currentProject?.project.name}
                  {selectedRepo && ` (${selectedRepo})`}
                </span>
              ) : (
                "Select a project and repo to run commands in"
              )}
              {activeProcesses.length > 0 && (
                <span className="text-md-on-error ml-1 animate-pulse">
                  · {activeProcesses.length} running
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeProcesses.length > 0 && (
              <Badge variant="primary-tonal" className="animate-pulse">
                <span className="material-symbols-rounded text-14 align-middle">pending</span>
                {activeProcesses.length} active
              </Badge>
            )}
            <Button variant="text" size="sm" onClick={() => setTerminalOutput([])}>
              <span className="material-symbols-rounded text-18">clear_all</span>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* ─── Project/Repo Selector ──────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-md-surface-container-low">
          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">business</span>
          <select
            value={selectedClient || ""}
            onChange={e => {
              setSelectedClient(e.target.value || null);
              setSelectedProject(null);
              setSelectedRepo(null);
            }}
            className="flex-1 min-w-[150px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-colors"
          >
            <option value="">All Clients</option>
            {uniqueClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">workspace_premium</span>
          <select
            value={selectedProject || ""}
            onChange={e => {
              setSelectedProject(e.target.value || null);
              setSelectedRepo(null);
            }}
            disabled={!selectedClient}
            className="flex-1 min-w-[150px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-colors disabled:opacity-50"
          >
            <option value="">Select Project</option>
            {availableProjects.map(p => (
              <option key={p.project.id} value={p.project.id}>{p.project.name}</option>
            ))}
          </select>

          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">code</span>
          <select
            value={selectedRepo || ""}
            onChange={e => setSelectedRepo(e.target.value || null)}
            disabled={!selectedProject}
            className="flex-1 min-w-[150px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-colors disabled:opacity-50"
          >
            <option value="">Select Repo</option>
            {availableRepos.map(r => (
              <option key={r.repo.name} value={r.repo.name}>{r.repo.name}</option>
            ))}
          </select>

          {selectedProject && (
            <Badge variant="secondary-tonal" className="shrink-0">
              {currentProject?.client.name} / {currentProject?.project.name}
            </Badge>
          )}
          {selectedRepo && (
            <Badge variant="primary-tonal" className="shrink-0">
              {currentWorkspace}
            </Badge>
          )}
        </div>

        {/* ─── Tabs ──────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-medium font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-md-primary text-md-on-primary shadow-md-1"
                  : "text-md-on-surface-variant hover:bg-md-on-surface/5"
              }`}
            >
              <span className="material-symbols-rounded text-18">{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && (
                <Badge variant={tab.key === "command" ? "secondary-tonal" : "primary-tonal"} className="ml-1">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* ─── Command Tab ───────────────────────────────────── */}
        {activeTab === "command" && (
          <div className="space-y-4">
            {/* Active processes */}
            {activeProcesses.length > 0 && (
              <div className="space-y-2">
                {activeProcesses.map(proc => {
                  const elapsed = Date.now() - proc.startedAt;
                  return (
                    <div key={proc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-md-primary-container/30">
                      <span className="h-3 w-3 rounded-full bg-md-primary animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-label-medium text-md-on-surface truncate">{proc.label}</p>
                        <p className="text-body-small text-md-on-surface-variant font-mono">{proc.command}</p>
                      </div>
                      {proc.repo && <Badge variant="secondary-tonal">{proc.repo}</Badge>}
                      <Badge variant="primary-tonal">
                        {formatDuration(elapsed)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Terminal output */}
            <div
              ref={terminalRef}
              className="bg-[#1a1b26] rounded-xl p-4 h-[300px] overflow-y-auto font-mono text-sm"
              onClick={() => inputRef.current?.focus()}
            >
              {terminalOutput.length === 0 ? (
                <div className="text-[#565f89] text-center py-8">
                  <span className="material-symbols-rounded text-48">api</span>
                  <p className="mt-2">Select a project &amp; repo, then run commands</p>
                  <p className="text-xs mt-1">Try: "git status", "list files", "build", "type check"</p>
                </div>
              ) : (
                terminalOutput.map((line, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap break-all ${
                      line.startsWith('❌') ? 'text-[#f7768e]' :
                      line.startsWith('⚠') ? 'text-[#e0af68]' :
                      line.startsWith('✅') ? 'text-[#9ece6a]' :
                      line.startsWith('[') ? 'text-[#565f89]' :
                      'text-[#a9b1d6]'
                    }`}
                  >
                    {line}
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="text-[#7aa2f7] animate-pulse flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#7aa2f7] animate-ping" />
                  Processing...
                </div>
              )}
            </div>

            {/* Command input */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-24 text-md-primary shrink-0">api</span>
              <Input
                ref={inputRef}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder={selectedRepo
                  ? `Run command in ${selectedRepo}... (e.g. "git status", "build")`
                  : "Select a repo first, then describe what to do..."
                }
                className="flex-1"
                autoFocus
              />
              <Button
                variant="filled"
                onClick={() => executeCommand(promptInput)}
                disabled={isProcessing || !promptInput.trim() || !selectedRepo}
              >
                {isProcessing ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <span className="material-symbols-rounded text-18">play_arrow</span>
                )}
                Run
              </Button>
            </div>

            {/* Quick actions */}
            <div>
              <p className="text-body-small text-md-on-surface-variant mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setPromptInput(action.prompt);
                      executeCommand(action.prompt);
                    }}
                    disabled={isProcessing || !selectedRepo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-rounded text-14">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Command history */}
            {commandHistory.length > 0 && (
              <div>
                <p className="text-body-small text-md-on-surface-variant mb-2">Recent Commands</p>
                <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25 max-h-[200px] overflow-y-auto">
                  {commandHistory.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={`material-symbols-rounded text-16 shrink-0 ${
                        h.status === "success" ? "text-[#9ece6a]" : h.status === "failed" ? "text-[#f7768e]" : "text-[#7aa2f7]"
                      }`}>
                        {h.status === "success" ? "check_circle" : h.status === "failed" ? "error" : "pending"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-small text-md-on-surface truncate">{h.input}</p>
                        {h.outputPreview && (
                          <p className="text-body-small text-md-on-surface-variant font-mono truncate">{h.outputPreview}</p>
                        )}
                      </div>
                      {h.repo && <Badge variant="secondary-tonal">{h.repo}</Badge>}
                      {h.duration && (
                        <span className="text-body-small text-md-on-surface-variant shrink-0">
                          {formatDuration(h.duration)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Processes Tab ─────────────────────────────────── */}
        {activeTab === "processes" && (
          <div className="space-y-4">
            {/* Active */}
            <div>
              <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">
                Active ({activeProcesses.length})
              </p>
              {activeProcesses.length === 0 ? (
                <div className="text-center py-8 bg-md-surface-container-low rounded-xl">
                  <span className="material-symbols-rounded text-40 text-md-on-surface-variant/40">settings_motion_mode</span>
                  <p className="text-body-medium text-md-on-surface-variant mt-2">No processes running</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeProcesses.map(proc => {
                    const elapsed = Date.now() - proc.startedAt;
                    return (
                      <div key={proc.id} className="bg-md-primary-container/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="h-3 w-3 rounded-full bg-md-primary animate-pulse" />
                          <p className="text-label-large text-md-on-surface flex-1">{proc.label}</p>
                          {proc.repo && <Badge variant="secondary-tonal">{proc.repo}</Badge>}
                          <Badge variant="primary-tonal" className="font-mono">
                            {formatDuration(elapsed)}
                          </Badge>
                        </div>
                        <p className="text-body-small text-md-on-surface-variant font-mono mb-2">{proc.command}</p>
                        {proc.output.length > 0 && (
                          <div className="bg-[#1a1b26] rounded-lg p-2 max-h-[120px] overflow-y-auto">
                            {proc.output.slice(-5).map((line, i) => (
                              <div key={i} className="text-xs font-mono text-[#a9b1d6]">{line}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent */}
            {recentProcesses.length > 0 && (
              <div>
                <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">
                  Recent ({recentProcesses.length})
                </p>
                <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25">
                  {recentProcesses.map(proc => (
                    <div key={proc.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={`material-symbols-rounded text-18 shrink-0 ${
                        proc.status === "completed" ? "text-[#9ece6a]" : "text-[#f7768e]"
                      }`}>
                        {proc.status === "completed" ? "check_circle" : "error"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-medium text-md-on-surface truncate">{proc.label}</p>
                        <p className="text-body-small text-md-on-surface-variant font-mono truncate">{proc.command}</p>
                      </div>
                      {proc.repo && <Badge variant="secondary-tonal">{proc.repo}</Badge>}
                      <span className="text-body-small text-md-on-surface-variant shrink-0">
                        {formatDuration(Date.now() - proc.startedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── GitHub Tab ────────────────────────────────────── */}
        {activeTab === "github" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-label-medium text-md-on-surface-variant font-medium">
                Repositories ({repos.length})
              </p>
              <div className="flex gap-2">
                <Button variant="text" size="sm" onClick={loadGithubRepos}>
                  <span className="material-symbols-rounded text-18">refresh</span>
                  Refresh
                </Button>
                <Button variant="outlined" size="sm" onClick={checkAllRepos} disabled={checkingRepos}>
                  <span className="material-symbols-rounded text-18">health_and_safety</span>
                  Check All
                </Button>
              </div>
            </div>

            {/* Repo list grouped by project */}
            {projectRepos.length === 0 ? (
              <div className="text-center py-12 bg-md-surface-container-low rounded-xl">
                <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">code</span>
                <p className="text-body-large text-md-on-surface-variant mt-4">No repos configured</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(reposByProject.entries()).map(([key, prs]) => {
                  const { client, project } = prs[0];
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary-tonal">{client.name}</Badge>
                        <span className="text-label-large text-md-on-surface">{project.name}</span>
                        <Badge variant="secondary-outlined">{prs.length} repo{prs.length > 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="space-y-2">
                        {prs.map(pr => (
                          <div
                            key={pr.repo.name}
                            className={`flex items-center gap-3 rounded-xl p-4 transition-colors cursor-pointer ${
                              selectedRepo === pr.repo.name
                                ? "bg-md-primary-container ring-1 ring-md-primary"
                                : "bg-md-surface-container-low hover:bg-md-surface-container"
                            }`}
                            onClick={() => {
                              selectRepo(pr);
                              setActiveTab("command");
                            }}
                          >
                            <span className="material-symbols-rounded text-24 text-md-primary shrink-0">code</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://github.com/${pr.project.githubRepos?.[prs.indexOf(pr)]?.split('/').slice(0, 2).join('/')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-label-large text-md-primary hover:underline truncate"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {pr.repo.name}
                                </a>
                                <Badge
                                  variant="secondary-tonal"
                                >
                                  <span className="material-symbols-rounded text-10 align-middle">check</span>
                                  Connected
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-body-small text-md-on-surface-variant">
                                <span>{pr.repo.path}</span>
                                {project.githubRepos && project.githubRepos.length > 0 && (
                                  <span className="truncate">
                                    {project.githubRepos.find(r => r.split('/')[1] === pr.repo.name)?.split('/')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="text" size="sm" onClick={e => {
                                e.stopPropagation();
                                selectRepo(pr);
                                setActiveTab("command");
                                setPromptInput("git pull");
                                executeCommand("git pull", pr.repo.path);
                              }}>
                                <span className="material-symbols-rounded text-16">sync</span>
                              </Button>
                              <a
                                href={`https://github.com/${pr.project.githubRepos?.find(r => r.split('/')[1] === pr.repo.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-md-on-surface/5 text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <span className="material-symbols-rounded text-18">open_in_new</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GitHub quick actions */}
            <div>
              <p className="text-body-small text-md-on-surface-variant mb-2">GitHub Actions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Fetch All", icon: "sync", prompt: "git fetch --all --prune" },
                  { label: "Check Remotes", icon: "cloud", prompt: "show git remotes" },
                  { label: "Check Commits", icon: "history", prompt: "show commit history" },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setPromptInput(action.prompt);
                      setActiveTab("command");
                      executeCommand(action.prompt);
                    }}
                    disabled={isProcessing || !selectedRepo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-rounded text-14">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
