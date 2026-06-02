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
}

interface CommandHistory {
  id: string;
  input: string;
  command: string;
  timestamp: number;
  duration?: number;
  status: "success" | "failed" | "pending";
  outputPreview?: string;
}

interface ProjectRepo {
  client: Client;
  project: ClientProject;
  repo: { name: string; path: string; full_name: string };
}

type TabKey = "command" | "processes" | "github";

// ─── Pi Harness Component ──────────────────────────────────────

export function PiHarness() {
  const [promptInput, setPromptInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [runningProcesses, setRunningProcesses] = useState<RunningProcess[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("command");
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Project/Repo selection ─────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  // ─── Load data on mount ─────────────────────────────────────
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    seedMockClients();
    setDataLoaded(true);
  }, []);

  // ─── Auto-scroll terminal ───────────────────────────────────
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // ─── Build repos from clients data (deduplicated) ───────────
  const projectRepos = useMemo((): ProjectRepo[] => {
    if (!dataLoaded) return [];
    const projects = getAllProjects();
    const results: ProjectRepo[] = [];
    const seen = new Set<string>();

    for (const { project, client } of projects) {
      const repoNames = project.githubRepos || [];
      for (const repoName of repoNames) {
        const repoShort = repoName.split('/')[1] || repoName;
        const dedupKey = `${client.id}::${project.id}::${repoShort}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        results.push({
          client,
          project,
          repo: { name: repoShort, path: `/workspace/${repoShort}`, full_name: repoName },
        });
      }
    }
    return results;
  }, [dataLoaded]);

  // ─── Unique clients (deduplicated) ──────────────────────────
  const uniqueClients = useMemo(() => {
    const set = new Map<string, Client>();
    for (const pr of projectRepos) {
      if (!set.has(pr.client.id)) set.set(pr.client.id, pr.client);
    }
    return Array.from(set.values());
  }, [projectRepos]);

  // ─── Available projects for selected client (deduplicated) ──
  const availableProjects = useMemo(() => {
    const set = new Map<string, { client: Client; project: ClientProject }>();
    const filtered = selectedClient
      ? projectRepos.filter(pr => pr.client.id === selectedClient)
      : projectRepos;
    for (const pr of filtered) {
      if (!set.has(pr.project.id)) {
        set.set(pr.project.id, { client: pr.client, project: pr.project });
      }
    }
    return Array.from(set.values());
  }, [selectedClient, projectRepos]);

  // ─── Available repos for selected project ───────────────────
  const availableRepos = useMemo(() => {
    if (!selectedProject) return [];
    return projectRepos.filter(pr => pr.project.id === selectedProject);
  }, [selectedProject, projectRepos]);

  // ─── Workspace path ─────────────────────────────────────────
  const currentWorkspace = useMemo(() => {
    if (!selectedRepo) return "/app";
    return projectRepos.find(pr => pr.repo.name === selectedRepo)?.repo.path || "/app";
  }, [selectedRepo, projectRepos]);

  // ─── Selected project info ──────────────────────────────────
  const currentProject = useMemo(() => {
    if (!selectedProject) return null;
    return projectRepos.find(pr => pr.project.id === selectedProject);
  }, [selectedProject, projectRepos]);

  // ─── Parse natural language to shell command ────────────────
  const parsePromptToCommand = (prompt: string): string => {
    const p = prompt.toLowerCase().trim();

    // ── Coding / vibe coding ───────────────────────────────────
    if (p.includes("login") || p.includes("sign in") || p.includes("auth page")) {
      return "find . -name '*.tsx' -path '*/auth/*' -o -name '*.tsx' -path '*/login/*' | grep -v node_modules | head -10";
    }
    if (p.includes("component") && (p.includes("create") || p.includes("make") || p.includes("build"))) {
      return "find . -name '*.tsx' ! -path '*/node_modules/*' | grep -i component | head -15";
    }
    if (p.includes("bug") || p.includes("fix") || p.includes("issue")) {
      return "git log --oneline -20 && echo '---' && git diff HEAD~5 --stat";
    }
    if (p.includes("feature") || p.includes("add") || p.includes("implement")) {
      return "git log --oneline -10 && ls -la src/";
    }
    if (p.includes("refactor") || p.includes("clean")) {
      return "ruff check . 2>/dev/null || npx eslint . 2>/dev/null || echo 'No linter found'";
    }
    if (p.includes("deploy") || p.includes("push to prod")) {
      return "git log --oneline -5 && git remote -v";
    }
    if (p.includes("review") || p.includes("code review")) {
      return "git diff --stat && echo '---' && git log --oneline -5";
    }
    if (p.includes("test") && !p.includes("find")) {
      return "find . -name '*.test.*' -o -name '*.spec.*' | grep -v node_modules | head -15";
    }
    if (p.includes("api") && p.includes("route")) {
      return "find . -path '*/api/*' -name '*.ts' | grep -v node_modules | head -15";
    }
    if (p.includes("readme") || p.includes("documentation")) {
      return "find . -name 'README*' ! -path '*/node_modules/*' | head -10";
    }

    // ── Git commands ───────────────────────────────────────────
    if (p.includes("git status") || p.includes("check status")) return "git status --short";
    if (p.includes("git log") || p.includes("show commits") || p.includes("commit history")) return "git log --oneline -10";
    if (p.includes("git diff") || p.includes("show changes")) return "git diff --stat";
    if (p.includes("git branch")) return "git branch -v";
    if (p.includes("add all") || p.includes("stage all")) return "git add -A";
    if (p.includes("pull") && p.includes("git")) return "git pull --rebase";
    if (p.includes("fetch")) return "git fetch --all --prune";

    // ── File operations ────────────────────────────────────────
    if (p.includes("list files") || p.includes("show files") || p.includes("ls")) return "ls -lah";
    if (p.includes("tree") || p.includes("directory structure")) return "tree -L 2 -I node_modules --dirsfirst";
    if (p.includes("find") && p.includes("ts")) return "find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | head -30";
    if (p.includes("find") && p.includes("test")) return "find . -name '*.test.*' -o -name '*.spec.*' | grep -v node_modules | head -20";
    if (p.includes("biggest files") || p.includes("large files")) return "find . -type f -size +1M -exec ls -lh {} \\; | sort -k5 -h -r | head -10";
    if (p.includes("recent") || p.includes("modified")) return "find . -type f -mtime -1 ! -path '*/node_modules/*' | head -20";

    // ── Build/check ────────────────────────────────────────────
    if (p.includes("build")) return "npm run build 2>&1 || echo 'No build script found'";
    if (p.includes("type check") || p.includes("tsc") || p.includes("typescript")) return "npx tsc --noEmit 2>&1 || echo 'No TypeScript config'";
    if (p.includes("lint") || p.includes("ruff")) return "ruff check . 2>&1 || npx eslint . 2>&1 || echo 'No linter found'";

    // ── System ─────────────────────────────────────────────────
    if (p.includes("disk") || p.includes("space")) return "du -sh ./* 2>/dev/null | sort -rh | head -10";
    if (p.includes("process") || p.includes("ps")) return "ps aux --sort=-%mem | head -15";
    if (p.includes("env") || p.includes("environment")) return "env | grep -v 'key\\|secret\\|token\\|password' | sort";
    if (p.includes("version")) return "node --version && npm --version && git --version";

    // ── GitHub ─────────────────────────────────────────────────
    if (p.includes("remote")) return "git remote -v";
    if (p.includes("origin")) return "git config --get remote.origin.url";

    // Default: treat as raw shell command
    return prompt;
  };

  // ─── Execute command via API ────────────────────────────────
  const executeCommand = useCallback(async (prompt: string, cwd?: string) => {
    const command = parsePromptToCommand(prompt);
    const processId = `proc_${Date.now()}`;
    const startMs = Date.now();
    const targetCwd = cwd || currentWorkspace;

    const process: RunningProcess = {
      id: processId, command, label: prompt, startedAt: startMs,
      status: "running", output: [],
    };

    setRunningProcesses(prev => [process, ...prev]);
    setIsProcessing(true);
    setTerminalOutput(prev => [...prev, `[${format(new Date(), 'HH:mm:ss')}] cd ${targetCwd} && ${command}`]);

    try {
      const res = await fetch("/api/workspace/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwd: targetCwd }),
      });

      if (!res.ok) {
        const err = await res.json();
        setRunningProcesses(prev => prev.map(p =>
          p.id === processId ? { ...p, status: "failed", output: [...p.output, err.error || "Failed"] } : p
        ));
        setCommandHistory(prev => [{
          id: `hist_${Date.now()}`, input: prompt, command, timestamp: Date.now(),
          duration: Date.now() - startMs, status: "failed", outputPreview: err.error,
        }, ...prev]);
        setTerminalOutput(prev => [...prev, `❌ ${err.error || "Command failed"}`]);
        setIsProcessing(false);
        setPromptInput("");
        return;
      }

      // JSON response: { output: string, exitCode: number }
      const data = await res.json();
      const exitCode = data.exitCode ?? 0;
      const rawOutput = data.output ?? "";
      const outputLines = typeof rawOutput === "string"
        ? rawOutput.split('\n').filter((l: string) => l.trim() !== "").slice(-50)
        : rawOutput;
      const completed = exitCode === 0;

      // Show output in terminal
      const displayLines = outputLines.map((l: string) =>
        typeof l === "string" ? (completed ? l : l)
        : JSON.stringify(l)
      );
      setTerminalOutput(prev => [
        ...prev,
        ...(displayLines as string[]),
        completed
          ? `✅ Done in ${Date.now() - startMs}ms`
          : `❌ Exit ${exitCode} in ${Date.now() - startMs}ms`
      ]);

      setRunningProcesses(prev => prev.map(p =>
        p.id === processId
          ? { ...p, status: completed ? "completed" : "failed", exitCode, output: [...p.output, ...(displayLines as string[])] }
          : p
      ));
      setCommandHistory(prev => [{
        id: `hist_${Date.now()}`, input: prompt, command, timestamp: Date.now(),
        duration: Date.now() - startMs, status: completed ? "success" : "failed",
        outputPreview: outputLines.slice(-3).join("\n") || (completed ? "Done" : `Exit ${exitCode}`),
      }, ...prev]);
    } catch (err: any) {
      setRunningProcesses(prev => prev.map(p =>
        p.id === processId ? { ...p, status: "failed", output: [...p.output, err.message] } : p
      ));
      setCommandHistory(prev => [{
        id: `hist_${Date.now()}`, input: prompt, command, timestamp: Date.now(),
        duration: Date.now() - startMs, status: "failed", outputPreview: err.message,
      }, ...prev]);
      setTerminalOutput(prev => [...prev, `❌ ${err.message}`]);
    }

    setIsProcessing(false);
    setPromptInput("");
  }, [currentWorkspace]);

  // ─── Keyboard handler ───────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (promptInput.trim() && !isProcessing) executeCommand(promptInput);
    }
  };

  // ─── Derived state ──────────────────────────────────────────
  const activeProcesses = useMemo(() => runningProcesses.filter(p => p.status === "running"), [runningProcesses]);
  const recentProcesses = useMemo(() => runningProcesses.filter(p => p.status !== "running").slice(0, 10), [runningProcesses]);

  const formatDuration = (ms: number): string => {
    const d = intervalToDuration({ start: 0, end: ms });
    if (d.minutes) return `${d.minutes}m ${d.seconds}s`;
    if (d.seconds) return `${d.seconds}s`;
    return `${ms}ms`;
  };

  const selectRepo = (pr: ProjectRepo) => {
    setSelectedClient(pr.client.id);
    setSelectedProject(pr.project.id);
    setSelectedRepo(pr.repo.name);
  };

  // ─── Quick actions ──────────────────────────────────────────
  const quickActions = [
    { label: "Git Status", icon: "visibility", prompt: "check git status" },
    { label: "Commits", icon: "history", prompt: "show commit history" },
    { label: "Files", icon: "folder", prompt: "list files" },
    { label: "Type Check", icon: "code", prompt: "run type check" },
    { label: "Build", icon: "build", prompt: "run build" },
    { label: "Diff", icon: "compare_arrows", prompt: "show changes" },
    { label: "Pull", icon: "sync", prompt: "git pull" },
    { label: "Test Files", icon: "science", prompt: "find test files" },
    { label: "API Routes", icon: "link", prompt: "find api routes" },
    { label: "Components", icon: "puzzle", prompt: "find components" },
  ];

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "command", label: "Command", icon: "terminal" },
    { key: "processes", label: "Processes", icon: "settings_motion_mode" },
    { key: "github", label: "GitHub", icon: "code" },
  ];

  // ─── Render ─────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="material-symbols-rounded text-28" style={{ color: "var(--color-md-primary)" }}>api</span>
              Pi Harness
              <Badge variant="secondary-tonal" className="text-[10px]">AI Command Interface</Badge>
            </CardTitle>
            <CardDescription>
              {selectedRepo
                ? <span className="font-medium text-md-primary">{currentProject?.client.name} → {currentProject?.project.name} ({selectedRepo})</span>
                : "Select a project & repo below, or just type a command"
              }
              {activeProcesses.length > 0 && <span className="text-md-on-error ml-1 animate-pulse">· {activeProcesses.length} running</span>}
            </CardDescription>
          </div>
          <Button variant="text" size="sm" onClick={() => setTerminalOutput([])}>
            <span className="material-symbols-rounded text-18">clear_all</span>Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* ─── Project/Repo Selector ──────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-md-surface-container-low">
          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">business</span>
          <select value={selectedClient || ""}
            onChange={e => { setSelectedClient(e.target.value || null); setSelectedProject(null); setSelectedRepo(null); }}
            className="flex-1 min-w-[140px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary outline-none">
            <option value="">All Clients</option>
            {uniqueClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">workspace_premium</span>
          <select value={selectedProject || ""}
            onChange={e => { setSelectedProject(e.target.value || null); setSelectedRepo(null); }}
            disabled={!selectedClient}
            className="flex-1 min-w-[140px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary outline-none disabled:opacity-50">
            <option value="">Select Project</option>
            {availableProjects.map(p => <option key={p.project.id} value={p.project.id}>{p.project.name}</option>)}
          </select>

          <span className="material-symbols-rounded text-18 text-md-on-surface-variant shrink-0">code</span>
          <select value={selectedRepo || ""}
            onChange={e => setSelectedRepo(e.target.value || null)}
            disabled={!selectedProject}
            className="flex-1 min-w-[140px] rounded-lg px-3 py-2 text-sm bg-transparent text-md-on-surface border border-md-outline/50 focus:border-md-primary outline-none disabled:opacity-50">
            <option value="">Select Repo</option>
            {availableRepos.map(r => <option key={r.repo.name} value={r.repo.name}>{r.repo.name}</option>)}
          </select>

          {selectedRepo && <Badge variant="primary-tonal">{currentWorkspace}</Badge>}
        </div>

        {/* ─── Tabs ──────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl mb-4">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-medium font-medium transition-colors ${
                activeTab === tab.key ? "bg-md-primary text-md-on-primary shadow-md-1" : "text-md-on-surface-variant hover:bg-md-on-surface/5"
              }`}>
              <span className="material-symbols-rounded text-18">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ─── Command Tab ───────────────────────────────────── */}
        {activeTab === "command" && (
          <div className="space-y-4">
            {activeProcesses.length > 0 && (
              <div className="space-y-2">
                {activeProcesses.map(proc => (
                  <div key={proc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-md-primary-container/30">
                    <span className="h-3 w-3 rounded-full bg-md-primary animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-label-medium text-md-on-surface truncate">{proc.label}</p>
                      <p className="text-body-small text-md-on-surface-variant font-mono">{proc.command}</p>
                    </div>
                    <Badge variant="primary-tonal">{formatDuration(Date.now() - proc.startedAt)}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Terminal */}
            <div ref={terminalRef} className="bg-[#1a1b26] rounded-xl p-4 h-[340px] overflow-y-auto font-mono text-sm"
              onClick={() => inputRef.current?.focus()}>
              {terminalOutput.length === 0 ? (
                <div className="text-[#565f89] text-center py-8">
                  <span className="material-symbols-rounded text-48">api</span>
                  <p className="mt-2">Type a command or describe what you want to do</p>
                  <p className="text-xs mt-1">"git status", "build", "find login page", "show changes"</p>
                </div>
              ) : (
                terminalOutput.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap break-all ${
                    line.startsWith('❌') ? 'text-[#f7768e]' : line.startsWith('⚠') ? 'text-[#e0af68]' :
                    line.startsWith('✅') ? 'text-[#9ece6a]' : line.startsWith('[') ? 'text-[#565f89]' : 'text-[#a9b1d6]'
                  }`}>{line}</div>
                ))
              )}
              {isProcessing && (
                <div className="text-[#7aa2f7] animate-pulse flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#7aa2f7] animate-ping" />Processing...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-24 text-md-primary shrink-0">api</span>
              <Input ref={inputRef} value={promptInput} onChange={e => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown} disabled={isProcessing}
                placeholder={selectedRepo ? `Run in ${selectedRepo}...` : "Type a command or describe what to do..."}
                className="flex-1" autoFocus />
              <Button variant="filled" onClick={() => executeCommand(promptInput)}
                disabled={isProcessing || !promptInput.trim()}>
                {isProcessing ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <span className="material-symbols-rounded text-18">play_arrow</span>}
                Run
              </Button>
            </div>

            {/* Quick actions */}
            <div>
              <p className="text-body-small text-md-on-surface-variant mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map(a => (
                  <button key={a.label} onClick={() => executeCommand(a.prompt)} disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50">
                    <span className="material-symbols-rounded text-14">{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            {commandHistory.length > 0 && (
              <div>
                <p className="text-body-small text-md-on-surface-variant mb-2">Recent Commands</p>
                <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25 max-h-[180px] overflow-y-auto">
                  {commandHistory.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-3 py-2">
                      <span className={`material-symbols-rounded text-16 shrink-0 ${h.status === "success" ? "text-[#9ece6a]" : "text-[#f7768e]"}`}>
                        {h.status === "success" ? "check_circle" : "error"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-small text-md-on-surface truncate">{h.input}</p>
                        {h.outputPreview && <p className="text-body-small text-md-on-surface-variant font-mono truncate">{h.outputPreview}</p>}
                      </div>
                      <span className="text-body-small text-md-on-surface-variant shrink-0">{formatDuration(h.duration || 0)}</span>
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
            <p className="text-label-medium text-md-on-surface-variant font-medium">Active ({activeProcesses.length})</p>
            {activeProcesses.length === 0 ? (
              <div className="text-center py-8 bg-md-surface-container-low rounded-xl">
                <span className="material-symbols-rounded text-40 text-md-on-surface-variant/40">settings_motion_mode</span>
                <p className="text-body-medium text-md-on-surface-variant mt-2">No processes running</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeProcesses.map(proc => (
                  <div key={proc.id} className="bg-md-primary-container/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="h-3 w-3 rounded-full bg-md-primary animate-pulse" />
                      <p className="text-label-large text-md-on-surface flex-1">{proc.label}</p>
                      <Badge variant="primary-tonal" className="font-mono">{formatDuration(Date.now() - proc.startedAt)}</Badge>
                    </div>
                    <p className="text-body-small text-md-on-surface-variant font-mono mb-2">{proc.command}</p>
                    {proc.output.length > 0 && (
                      <div className="bg-[#1a1b26] rounded-lg p-2 max-h-[120px] overflow-y-auto">
                        {proc.output.slice(-5).map((line, i) => <div key={i} className="text-xs font-mono text-[#a9b1d6]">{line}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {recentProcesses.length > 0 && (
              <div>
                <p className="text-label-medium text-md-on-surface-variant font-medium">Recent ({recentProcesses.length})</p>
                <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25">
                  {recentProcesses.map(proc => (
                    <div key={proc.id} className="flex items-center gap-3 px-3 py-2">
                      <span className={`material-symbols-rounded text-18 shrink-0 ${proc.status === "completed" ? "text-[#9ece6a]" : "text-[#f7768e]"}`}>
                        {proc.status === "completed" ? "check_circle" : "error"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-medium text-md-on-surface truncate">{proc.label}</p>
                        <p className="text-body-small text-md-on-surface-variant font-mono truncate">{proc.command}</p>
                      </div>
                      <span className="text-body-small text-md-on-surface-variant shrink-0">{formatDuration(Date.now() - proc.startedAt)}</span>
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
            <div className="space-y-3">
              {projectRepos.length === 0 ? (
                <div className="text-center py-12 bg-md-surface-container-low rounded-xl">
                  <span className="material-symbols-rounded text-48 text-md-on-surface-variant/40">code</span>
                  <p className="text-body-large text-md-on-surface-variant mt-4">No repos configured</p>
                </div>
              ) : (() => {
                // Group by project
                const grouped = new Map<string, ProjectRepo[]>();
                for (const pr of projectRepos) {
                  const key = `${pr.client.id}::${pr.project.id}`;
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(pr);
                }
                return Array.from(grouped.entries()).map(([key, prs]) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary-tonal">{prs[0].client.name}</Badge>
                      <span className="text-label-large text-md-on-surface">{prs[0].project.name}</span>
                      <Badge variant="secondary-outlined">{prs.length} repo{prs.length > 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="space-y-2">
                      {prs.map(pr => (
                        <div key={pr.repo.name}
                          className={`flex items-center gap-3 rounded-xl p-4 transition-colors cursor-pointer ${
                            selectedRepo === pr.repo.name ? "bg-md-primary-container ring-1 ring-md-primary" : "bg-md-surface-container-low hover:bg-md-surface-container"
                          }`}
                          onClick={() => { selectRepo(pr); setActiveTab("command"); }}>
                          <span className="material-symbols-rounded text-24 text-md-primary shrink-0">code</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <a href={`https://github.com/${pr.repo.full_name}`} target="_blank" rel="noopener noreferrer"
                                className="text-label-large text-md-primary hover:underline truncate" onClick={e => e.stopPropagation()}>
                                {pr.repo.name}
                              </a>
                              <Badge variant="secondary-tonal"><span className="material-symbols-rounded text-10 align-middle">check</span>Connected</Badge>
                            </div>
                            <p className="text-body-small text-md-on-surface-variant mt-1">{pr.repo.path}</p>
                          </div>
                          <Button variant="text" size="sm" onClick={e => {
                            e.stopPropagation();
                            selectRepo(pr);
                            setActiveTab("command");
                            executeCommand("git pull", pr.repo.path);
                          }}><span className="material-symbols-rounded text-16">sync</span></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
