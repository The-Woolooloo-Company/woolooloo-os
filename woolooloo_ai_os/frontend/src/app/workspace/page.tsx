"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClients, getAllProjects, ClientProject } from "@/lib/clients";
import { getStaff } from "@/lib/staff";
import { useExternalProjects } from "@/hooks/useExternalProjects";

// ─── Types ─────────────────────────────────────────────────────────────

interface TerminalLine {
  type: "input" | "output" | "error" | "info" | "system";
  content: string;
  timestamp: Date;
}

interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

interface GitStatus {
  status: string;
  branch: string;
  ahead: number;
}

// ─── Workspace Page ────────────────────────────────────────────────────

type Panel = "terminal" | "files" | "git" | "context";

export default function WorkspacePage() {
  const { clockifyEntries, linearTasks, loading: dataLoading } = useExternalProjects();
  const [activePanel, setActivePanel] = useState<Panel>("terminal");
  const [clients] = useState(() => getClients());
  const [allProjects] = useState(() => getAllProjects());
  const [staff] = useState(() => getStaff());

  // ─── Terminal State ─────────────────────────────────────────────
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // ─── Files State ────────────────────────────────────────────────
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState("/home/dustin/Dropbox/Woolooloo_OS");
  const [fileContent, setFileContent] = useState<{ path: string; name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // ─── Git State ──────────────────────────────────────────────────
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [gitLog, setGitLog] = useState<any[]>([]);
  const [gitMessage, setGitMessage] = useState("");
  const [gitLoading, setGitLoading] = useState(false);

  // ─── Workspace context ──────────────────────────────────────────
  const [workspaceContext, setWorkspaceContext] = useState("");

  // ─── Load file tree on mount ───────────────────────────────────
  useEffect(() => {
    loadFileTree();
    loadGitStatus();
    setTerminalLines([{
      type: "system",
      content: `🖥️  Woolooloo OS Workspace — ${new Date().toLocaleString()}`,
      timestamp: new Date(),
    }, {
      type: "info",
      content: `Path: /home/dustin/Dropbox/Woolooloo_OS`,
      timestamp: new Date(),
    }, {
      type: "info",
      content: `Type a command and press Enter, or select a panel above.`,
      timestamp: new Date(),
    }]);
  }, []);

  // ─── Build workspace context ───────────────────────────────────
  useEffect(() => {
    if (dataLoading) return;
    const ctx = buildWorkspaceContext(clients, allProjects, staff, linearTasks, clockifyEntries);
    setWorkspaceContext(ctx);
  }, [dataLoading, clients, allProjects, staff, linearTasks, clockifyEntries]);

  // ─── Auto-scroll terminal ──────────────────────────────────────
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // ─── Execute command ───────────────────────────────────────────
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;

    // Add input line
    setTerminalLines(prev => [...prev, {
      type: "input",
      content: `  $ ${cmd}`,
      timestamp: new Date(),
    }]);

    setIsRunning(true);

    try {
      const res = await fetch("/api/workspace/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });

      if (!res.ok) {
        const err = await res.json();
        setTerminalLines(prev => [...prev, { type: "error", content: err.error, timestamp: new Date() }]);
        setIsRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith('out:')) {
            const content = line.slice(4);
            if (content.trim()) {
              setTerminalLines(prev => [...prev, { type: "output", content, timestamp: new Date() }]);
            }
          } else if (line.startsWith('err:')) {
            const content = line.slice(4);
            if (content.trim()) {
              setTerminalLines(prev => [...prev, { type: "error", content, timestamp: new Date() }]);
            }
          } else if (line.startsWith('exit:')) {
            const code = line.slice(5);
            if (code !== '0') {
              setTerminalLines(prev => [...prev, { type: "system", content: `  (exit code: ${code})`, timestamp: new Date() }]);
            }
          }
        }
      }

      // Handle remaining buffer
      if (buffer) {
        if (buffer.startsWith('out:')) {
          setTerminalLines(prev => [...prev, { type: "output", content: buffer.slice(4), timestamp: new Date() }]);
        } else if (buffer.startsWith('err:')) {
          setTerminalLines(prev => [...prev, { type: "error", content: buffer.slice(4), timestamp: new Date() }]);
        } else if (buffer.startsWith('exit:')) {
          const code = buffer.slice(5);
          if (code !== '0') {
            setTerminalLines(prev => [...prev, { type: "system", content: `  (exit code: ${code})`, timestamp: new Date() }]);
          }
        }
      }
    } catch (err: any) {
      setTerminalLines(prev => [...prev, { type: "error", content: `  ${err.message}`, timestamp: new Date() }]);
    }

    setIsRunning(false);
    setCommandInput("");
  }, []);

  // ─── Handle Enter key ─────────────────────────────────────────
  const handleCommandSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand(commandInput);
    }
  };

  // ─── Load file tree ───────────────────────────────────────────
  const loadFileTree = async (p?: string) => {
    const targetPath = p || currentPath;
    setFileLoading(true);
    try {
      const res = await fetch(`/api/workspace/files?action=list&path=${encodeURIComponent(targetPath)}`);
      const data = await res.json();
      if (data.entries) {
        const nodes: FileNode[] = data.entries.map((e: any) => ({
          name: e.name,
          type: e.type,
          path: e.path,
        }));
        setFileTree(nodes);
        setCurrentPath(targetPath);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
    setFileLoading(false);
  };

  // ─── Read file ────────────────────────────────────────────────
  const readFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/files?action=read&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content) {
        setFileContent({ path: data.path, name: data.name, content: data.content });
      }
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  // ─── Git operations ───────────────────────────────────────────
  const loadGitStatus = async () => {
    try {
      const [statusRes, logRes] = await Promise.all([
        fetch("/api/workspace/git?op=status"),
        fetch("/api/workspace/git?op=log&count=10"),
      ]);
      const statusData = await statusRes.json();
      const logData = await logRes.json();
      setGitStatus(statusData);
      setGitLog(logData.commits || []);
    } catch (err) {
      console.error("Failed to load git status:", err);
    }
  };

  const gitAddAll = async () => {
    setGitLoading(true);
    try {
      await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add" }),
      });
      await loadGitStatus();
      addTerminalLine("system", "  git add .");
    } catch (err: any) {
      addTerminalLine("error", `  ${err.message}`);
    }
    setGitLoading(false);
  };

  const gitCommit = async () => {
    if (!gitMessage.trim()) return;
    setGitLoading(true);
    try {
      const res = await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", message: gitMessage }),
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLine("info", `  ✅ Committed: ${data.commit} — "${gitMessage}"`);
        setGitMessage("");
      } else {
        addTerminalLine("error", `  ${data.message || data.error}`);
      }
      await loadGitStatus();
    } catch (err: any) {
      addTerminalLine("error", `  ${err.message}`);
    }
    setGitLoading(false);
  };

  const gitPush = async () => {
    setGitLoading(true);
    try {
      const res = await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push" }),
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLine("info", "  ✅ Pushed to origin");
      } else {
        addTerminalLine("error", `  ${data.message || data.error}`);
      }
      await loadGitStatus();
    } catch (err: any) {
      addTerminalLine("error", `  ${err.message}`);
    }
    setGitLoading(false);
  };

  const addTerminalLine = (type: TerminalLine["type"], content: string) => {
    setTerminalLines(prev => [...prev, { type, content, timestamp: new Date() }]);
  };

  // ─── Copy context to clipboard ────────────────────────────────
  const copyContext = () => {
    navigator.clipboard.writeText(workspaceContext).then(() => {
      addTerminalLine("info", "  ✅ Workspace context copied to clipboard");
    });
  };

  // ─── Panel navigation ─────────────────────────────────────────
  const panels: { key: Panel; label: string; icon: string }[] = [
    { key: "terminal", label: "Terminal", icon: "terminal" },
    { key: "files", label: "Files", icon: "folder" },
    { key: "git", label: "Git", icon: "commit" },
    { key: "context", label: "Context", icon: "info" },
  ];

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-display-small text-md-on-surface">Workspace</h1>
            <p className="text-body-large text-md-on-surface-variant mt-0.5">
              Terminal · Files · Git · Agent Context
            </p>
          </div>
          <div className="flex items-center gap-2">
            {gitStatus && (
              <Badge variant="primary-tonal">
                <span className="material-symbols-rounded text-16 align-middle">commit</span>
                {gitStatus.branch}
              </Badge>
            )}
            <Button variant="outlined" size="sm" onClick={loadGitStatus}>
              <span className="material-symbols-rounded text-18">refresh</span>
            </Button>
          </div>
        </div>

        {/* Panel tabs */}
        <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl mb-4 overflow-x-auto">
          {panels.map(panel => (
            <button
              key={panel.key}
              onClick={() => setActivePanel(panel.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-label-medium font-medium transition-colors whitespace-nowrap ${
                activePanel === panel.key
                  ? "bg-md-primary text-md-on-primary shadow-md-1"
                  : "text-md-on-surface-variant hover:bg-md-on-surface/5"
              }`}
            >
              <span className="material-symbols-rounded text-18">{panel.icon}</span>
              {panel.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* ─── Main Panel (Terminal / Files / Git / Context) ─── */}
          <div className={activePanel === "terminal" ? "lg:col-span-3" : "lg:col-span-3"}>
            {/* ─── Terminal ──────────────────────────────────────── */}
            {activePanel === "terminal" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">terminal</span>
                        Terminal
                      </CardTitle>
                      <CardDescription>Execute commands in the workspace directory</CardDescription>
                    </div>
                    <Button variant="text" size="sm" onClick={() => setTerminalLines([])}>
                      <span className="material-symbols-rounded text-18">clear_all</span>
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Output */}
                  <div
                    ref={terminalRef}
                    className="bg-[#1a1b26] rounded-xl p-4 h-[520px] overflow-y-auto font-mono text-sm leading-relaxed"
                  >
                    {terminalLines.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap break-all">
                        {line.type === "input" && (
                          <div className="text-[#565f89]">{line.content}</div>
                        )}
                        {line.type === "output" && (
                          <div className="text-[#a9b1d6]">{line.content}</div>
                        )}
                        {line.type === "error" && (
                          <div className="text-[#f7768e]">{line.content}</div>
                        )}
                        {line.type === "info" && (
                          <div className="text-[#7aa2f7]">{line.content}</div>
                        )}
                        {line.type === "system" && (
                          <div className="text-[#565f89]">{line.content}</div>
                        )}
                      </div>
                    ))}
                    {isRunning && (
                      <div className="text-[#565f89] animate-pulse">⠋</div>
                    )}
                  </div>

                  {/* Command input */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[#7aa2f7] font-mono text-sm">❯</span>
                    <input
                      type="text"
                      value={commandInput}
                      onChange={e => setCommandInput(e.target.value)}
                      onKeyDown={handleCommandSubmit}
                      disabled={isRunning}
                      placeholder="Enter a command..."
                      className="flex-1 bg-transparent text-[#a9b1d6] font-mono text-sm placeholder:text-[#565f89] focus:outline-none disabled:opacity-50"
                    />
                    <Button
                      variant="filled"
                      size="sm"
                      onClick={() => executeCommand(commandInput)}
                      disabled={isRunning || !commandInput.trim()}
                    >
                      {isRunning ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      ) : (
                        <span className="material-symbols-rounded text-18">play_arrow</span>
                      )}
                      Run
                    </Button>
                  </div>

                  {/* Quick commands */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["ls", "git status", "git log --oneline -5", "find . -name '*.tsx' -count 2>/dev/null", "tree -L 2 -I 'node_modules|.next|dist'"].map(cmd => (
                      <button
                        key={cmd}
                        onClick={() => executeCommand(cmd)}
                        disabled={isRunning}
                        className="px-3 py-1.5 rounded-full text-xs font-mono bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Files ─────────────────────────────────────────── */}
            {activePanel === "files" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">folder</span>
                        File Explorer
                      </CardTitle>
                      <CardDescription>{currentPath}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {fileContent && (
                        <Button variant="text" size="sm" onClick={() => setFileContent(null)}>
                          <span className="material-symbols-rounded text-18">close</span>
                          Close
                        </Button>
                      )}
                      <Button variant="text" size="sm" onClick={() => loadFileTree()}>
                        <span className="material-symbols-rounded text-18">refresh</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File list */}
                    <div>
                      <div className="text-label-medium text-md-on-surface-variant font-medium mb-2">
                        {fileContent ? fileContent.name : "Directory"}
                      </div>
                      <div className="bg-md-surface-container-low rounded-xl p-2 h-[520px] overflow-y-auto">
                        {fileLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-md-primary border-r-transparent" />
                          </div>
                        ) : (
                          <div>
                            {currentPath !== "/home/dustin/Dropbox/Woolooloo_OS" && (
                              <button
                                onClick={() => loadFileTree("/home/dustin/Dropbox/Woolooloo_OS")}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm"
                              >
                                <span className="material-symbols-rounded text-18">arrow_back</span>
                                ..
                              </button>
                            )}
                            {fileTree
                              .filter(f => f.type === "directory")
                              .map(f => (
                                <button
                                  key={f.path}
                                  onClick={() => loadFileTree(f.path)}
                                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-md-on-surface hover:bg-md-on-surface/5 text-sm"
                                >
                                  <span className="material-symbols-rounded text-20 text-md-primary">folder</span>
                                  {f.name}
                                </button>
                              ))}
                            {fileTree
                              .filter(f => f.type === "file")
                              .slice(0, 50)
                              .map(f => (
                                <button
                                  key={f.path}
                                  onClick={() => readFile(f.path)}
                                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm"
                                >
                                  <span className="material-symbols-rounded text-20">description</span>
                                  {f.name}
                                </button>
                              ))}
                            {fileTree.length === 0 && (
                              <p className="text-center text-body-medium text-md-on-surface-variant py-8">Empty directory</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File viewer */}
                    {fileContent && (
                      <div>
                        <div className="text-label-medium text-md-on-surface-variant font-medium mb-2">
                          {fileContent.name}
                        </div>
                        <pre className="bg-[#1a1b26] rounded-xl p-4 h-[520px] overflow-auto text-sm font-mono text-[#a9b1d6] whitespace-pre-wrap break-all">
                          {fileContent.content}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Git ───────────────────────────────────────────── */}
            {activePanel === "git" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">commit</span>
                        Git Operations
                      </CardTitle>
                      <CardDescription>
                        Branch: {gitStatus?.branch || "loading..."} · Ahead: {gitStatus?.ahead || "?"}
                      </CardDescription>
                    </div>
                    <Button variant="text" size="sm" onClick={loadGitStatus}>
                      <span className="material-symbols-rounded text-18">refresh</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Commit controls */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Commit message..."
                      value={gitMessage}
                      onChange={e => setGitMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outlined" size="sm" onClick={gitAddAll} disabled={gitLoading}>
                      <span className="material-symbols-rounded text-18">add</span>
                      Add All
                    </Button>
                    <Button variant="filled" size="sm" onClick={gitCommit} disabled={gitLoading || !gitMessage.trim()}>
                      <span className="material-symbols-rounded text-18">commit</span>
                      Commit
                    </Button>
                    <Button variant="outlined" size="sm" onClick={gitPush} disabled={gitLoading}>
                      <span className="material-symbols-rounded text-18">cloud_upload</span>
                      Push
                    </Button>
                  </div>

                  {/* Status */}
                  {gitStatus?.status && (
                    <div className="mb-4">
                      <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">Changes</p>
                      <div className="bg-md-surface-container-low rounded-xl p-3">
                        <pre className="text-sm font-mono text-md-on-surface whitespace-pre-wrap break-all">
                          {gitStatus.status || "No changes"}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Recent commits */}
                  <div>
                    <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">Recent Commits</p>
                    <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25">
                      {gitLog.map((c: any) => (
                        <div key={c.sha} className="px-4 py-3 flex items-center gap-3">
                          <Badge variant="secondary-outlined" className="font-mono text-xs">{c.sha}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-medium text-md-on-surface truncate">{c.message}</p>
                            <p className="text-body-small text-md-on-surface-variant">{c.author} · {c.date}</p>
                          </div>
                        </div>
                      ))}
                      {gitLog.length === 0 && (
                        <p className="text-center py-6 text-body-medium text-md-on-surface-variant">No commits</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Context ──────────────────────────────────────── */}
            {activePanel === "context" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">info</span>
                        Agent Context
                      </CardTitle>
                      <CardDescription>Full project context for AI agents — copy and paste into any AI tool</CardDescription>
                    </div>
                    <Button variant="filled" size="sm" onClick={copyContext}>
                      <span className="material-symbols-rounded text-18">content_copy</span>
                      Copy Context
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-md-surface-container-low rounded-xl p-4 h-[600px] overflow-auto text-sm text-md-on-surface whitespace-pre-wrap break-all">
                    {workspaceContext || "Loading context..."}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ─── Sidebar (context summary) ──────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>Workspace Stats</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Clients</span><span className="text-body-medium font-medium text-md-on-surface">{clients.length}</span></div>
                <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Projects</span><span className="text-body-medium font-medium text-md-on-surface">{allProjects.length}</span></div>
                <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Tasks</span><span className="text-body-medium font-medium text-md-on-surface">{linearTasks.length}</span></div>
                <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Time Entries</span><span className="text-body-medium font-medium text-md-on-surface">{clockifyEntries.length}</span></div>
                <div className="flex justify-between"><span className="text-body-medium text-md-on-surface-variant">Team</span><span className="text-body-medium font-medium text-md-on-surface">{staff.length}</span></div>
              </CardContent>
            </Card>

            {/* Projects list */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>Projects</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {allProjects.map(({ project, client }) => (
                    <div key={project.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-md-on-surface/5">
                      <span className="material-symbols-rounded text-18 text-md-primary">folder</span>
                      <div className="min-w-0">
                        <p className="text-body-medium text-md-on-surface truncate">{project.name}</p>
                        <p className="text-body-small text-md-on-surface-variant">{client.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick commands for this project */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  { label: "Build Frontend", cmd: "cd woolooloo_ai_os/frontend && npm run build" },
                  { label: "Type Check", cmd: "cd woolooloo_ai_os/frontend && npx tsc --noEmit" },
                  { label: "Git Status", cmd: "git status --short" },
                  { label: "Git Diff", cmd: "git diff --stat" },
                  { label: "List TSX Files", cmd: "find woolooloo_ai_os/frontend -name '*.tsx' | head -30" },
                  { label: "Env Check", cmd: "cat woolooloo_ai_os/frontend/.env.local | grep -v KEY | grep -v TOKEN" },
                ].map(q => (
                  <button
                    key={q.label}
                    onClick={() => {
                      setActivePanel("terminal");
                      executeCommand(q.cmd);
                    }}
                    disabled={isRunning}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-md-surface-container-high hover:bg-md-surface-container-highest text-body-medium text-md-on-surface transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-rounded text-16 align-middle text-md-primary">play_arrow</span>
                    {q.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Helper: Build workspace context string ────────────────────────

function buildWorkspaceContext(
  clients: any[],
  allProjects: any[],
  staff: any[],
  linearTasks: any[],
  clockifyEntries: any[],
): string {
  const totalHours = clockifyEntries.reduce((s: number, e: any) => s + e.duration / 3600, 0);
  const activeTasks = linearTasks.filter((t: any) => t.state?.type !== "completed").length;
  const doneTasks = linearTasks.filter((t: any) => t.state?.type === "completed").length;

  const lines = [
    "═══════════════════════════════════════════════════════",
    "  WOOLooloo OS — Agent Context",
    "  Generated:",
    "═══════════════════════════════════════════════════════",
    "",
    "## Project",
    "- Name: Woolooloo OS",
    "- Path: /home/dustin/Dropbox/Woolooloo_OS/woolooloo_ai_os/frontend",
    "- Tech: Next.js 15, TypeScript, Tailwind CSS v4, Recharts",
    "- Framework: Material Design 3 components",
    "- Branch: main",
    "- Remote: The-Woolooloo-Company/woolooloo-os",
    "",
    "## Clients & Projects",
  ];

  for (const client of clients) {
    lines.push(`\n### ${client.name}`);
    const cProjects = allProjects.filter(p => p.client.id === client.id);
    for (const { project } of cProjects) {
      const pTasks = linearTasks.filter((t: any) => t.projectId === project.linearProjectId);
      const pHours = clockifyEntries.filter((e: any) => e.projectId === project.clockifyProjectId)
        .reduce((s: number, e: any) => s + e.duration / 3600, 0);
      lines.push(`- ${project.name}: Linear=${project.linearProjectId?.slice(0, 8)}, Clockify=${project.clockifyProjectId?.slice(0, 8)}, Tasks=${pTasks.length}, Hours=${pHours.toFixed(1)}`);
    }
  }

  lines.push("", "## Team", ...staff.map((s: any) => `- ${s.name}: ${s.role} (${s.status})`));

  lines.push("", "## Tasks Summary", `- Total: ${linearTasks.length}`, `- Active: ${activeTasks}`, `- Done: ${doneTasks}`);

  lines.push("", "## Time Tracking", `- Total Entries: ${clockifyEntries.length}`, `- Total Hours: ${totalHours.toFixed(1)}h`);

  const activeEntries = clockifyEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + e.duration / 3600, 0);
  lines.push(`- Billable Hours: ${activeEntries.toFixed(1)}h`);

  const revenue = clockifyEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + (e.duration / 3600) * (e.billableRate || 0), 0);
  lines.push(`- Revenue: R${Math.round(revenue).toLocaleString()}`);

  lines.push("", "## Integrations", "- Linear API: Configured", "- Clockify API: Configured (workspace: 628df4f7ff03bd3855e1fc0e)");
  lines.push("- GitHub: The-Woolooloo-Company org");
  lines.push("- AI Harness: pi (default)");

  lines.push("", "## Admin", "- Default user: dustin");
  lines.push("- Frontend port: 5000 (dev)");

  lines.push("", "═══════════════════════════════════════════════════════");

  return lines.join("\n");
}
