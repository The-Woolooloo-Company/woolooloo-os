"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClients, getAllProjects, ClientProject } from "@/lib/clients";

// ─── Types ─────────────────────────────────────────────────────────────

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "info" | "system";
  content: string;
  timestamp: number;
}

interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
}

type Panel = "terminal" | "files" | "git";
type WorkspaceMode = "project" | "misc";

// ─── Workspace Page ────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [activePanel, setActivePanel] = useState<Panel>("terminal");
  const [clients] = useState(() => getClients());
  const [allProjects] = useState(() => getAllProjects());
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("misc");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [miscRoot, setMiscRoot] = useState("/workspace/misc");

  // ─── Terminal State ────────────────────────────────────────────
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState("/app");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineId = useRef(0);

  // ─── Files State ──────────────────────────────────────────────
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState("/app");
  const [fileContent, setFileContent] = useState<{ path: string; name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewDir, setShowNewDir] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  // ─── Git State ────────────────────────────────────────────────
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [gitLog, setGitLog] = useState<any[]>([]);
  const [gitMessage, setGitMessage] = useState("");
  const [gitLoading, setGitLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repos, setRepos] = useState<{ name: string; path: string }[]>([]);

  // ─── Derived workspace path ──────────────────────────────────
  const getWorkspacePath = useCallback(() => {
    if (workspaceMode === "misc") return miscRoot;
    // Find the project's main repo path
    const proj = allProjects.find(p => p.project.id === selectedProjectId);
    if (proj && proj.project.githubRepos && proj.project.githubRepos.length > 0) {
      // Try to find the repo in the workspace
      return `/app`; // Default to app root, terminal can cd
    }
    return "/app";
  }, [workspaceMode, miscRoot, selectedProjectId, allProjects]);

  // ─── Load file tree on mount ────────────────────────────────
  useEffect(() => {
    const initPath = getWorkspacePath();
    setCwd(initPath);
    loadFileTree(initPath);
    setTerminalLines([{
      id: lineId.current++,
      type: "system",
      content: ` Woolooloo OS Workspace — ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
    }, {
      id: lineId.current++,
      type: "info",
      content: ` Path: ${initPath}`,
      timestamp: Date.now(),
    }, {
      id: lineId.current++,
      type: "info",
      content: ` Mode: ${workspaceMode === "misc" ? "Misc (custom directories)" : "Project workspace"}`,
      timestamp: Date.now(),
    }, {
      id: lineId.current++,
      type: "info",
      content: ` Type a command and press Enter. Use ↑/↓ for history.`,
      timestamp: Date.now(),
    }]);
  }, [workspaceMode, selectedProjectId, getWorkspacePath]);

  // ─── Auto-scroll terminal ────────────────────────────────────
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // ─── Execute command ────────────────────────────────────────
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;

    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    const inputId = lineId.current++;
    setTerminalLines(prev => [...prev, {
      id: inputId,
      type: "input",
      content: `❯ ${cmd}`,
      timestamp: Date.now(),
    }]);

    setIsRunning(true);

    try {
      const res = await fetch("/api/workspace/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd }),
      });

      if (!res.ok) {
        const err = await res.json();
        setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: err.error, timestamp: Date.now() }]);
        setIsRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputChunks: string[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          if (!rawLine) continue;
          if (rawLine.startsWith('out:')) {
            const content = rawLine.slice(4);
            if (content.trim()) {
              outputChunks.push(content);
              setTerminalLines(prev => [...prev, { id: lineId.current++, type: "output", content, timestamp: Date.now() }]);
            }
          } else if (rawLine.startsWith('err:')) {
            const content = rawLine.slice(4);
            if (content.trim()) {
              setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content, timestamp: Date.now() }]);
            }
          } else if (rawLine.startsWith('exit:')) {
            const code = rawLine.slice(5);
            if (code !== '0') {
              setTerminalLines(prev => [...prev, { id: lineId.current++, type: "system", content: `(exit code: ${code})`, timestamp: Date.now() }]);
            }
          }
        }
      }

      if (buffer) {
        if (buffer.startsWith('out:')) {
          const content = buffer.slice(4);
          if (content.trim()) {
            setTerminalLines(prev => [...prev, { id: lineId.current++, type: "output", content, timestamp: Date.now() }]);
          }
        } else if (buffer.startsWith('err:')) {
          setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: buffer.slice(4), timestamp: Date.now() }]);
        } else if (buffer.startsWith('exit:')) {
          const code = buffer.slice(5);
          if (code !== '0') {
            setTerminalLines(prev => [...prev, { id: lineId.current++, type: "system", content: `(exit code: ${code})`, timestamp: Date.now() }]);
          }
        }
      }
    } catch (err: any) {
      setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: err.message, timestamp: Date.now() }]);
    }

    setIsRunning(false);
    setCommandInput("");
  }, [cwd]);

  // ─── Handle keyboard ────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand(commandInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommandInput("");
        } else {
          setHistoryIndex(newIndex);
          setCommandInput(commandHistory[newIndex]);
        }
      }
    }
  };

  // ─── File operations ────────────────────────────────────────
  const loadFileTree = async (path?: string) => {
    const targetPath = path || currentPath;
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
        setCwd(targetPath);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
    setFileLoading(false);
  };

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

  const writeFile = async (path: string, content: string) => {
    try {
      await fetch("/api/workspace/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path, content }),
      });
      loadFileTree();
    } catch (err) {
      console.error("Failed to write file:", err);
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    const fullPath = `${currentPath}/${newFileName}`;
    await writeFile(fullPath, "");
    setNewFileName("");
    setShowNewFile(false);
    loadFileTree();
  };

  const createDirectory = async () => {
    if (!newFileName.trim()) return;
    const fullPath = `${currentPath}/${newFileName}`;
    await executeCommand(`mkdir -p ${fullPath}`);
    setNewFileName("");
    setShowNewDir(false);
    loadFileTree();
  };

  const deleteItem = async (path: string) => {
    await executeCommand(`rm -rf ${path}`);
    setShowDelete(null);
    loadFileTree();
  };

  const renameItem = async (oldPath: string, newName: string) => {
    const parent = oldPath.substring(0, oldPath.lastIndexOf('/') + 1);
    const newPath = parent + newName;
    await executeCommand(`mv ${oldPath} ${newPath}`);
    loadFileTree();
  };

  // ─── Git operations ────────────────────────────────────────
  const loadGitStatus = async (repoPath?: string) => {
    try {
      const target = repoPath || cwd;
      const [statusRes, logRes] = await Promise.all([
        fetch(`/api/workspace/git?op=status&path=${encodeURIComponent(target)}`),
        fetch(`/api/workspace/git?op=log&count=10&path=${encodeURIComponent(target)}`),
      ]);
      const statusData = await statusRes.json();
      const logData = await logRes.json();
      setGitStatus(statusData);
      setGitLog(logData.commits || []);
    } catch (err) {
      console.error("Failed to load git status:", err);
    }
  };

  const loadRepos = useCallback(async () => {
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();
      setRepos(data.repositories || []);
    } catch {
      setRepos([]);
    }
  }, []);

  useEffect(() => {
    loadGitStatus();
    loadRepos();
  }, [loadRepos]);

  const gitAddAll = async () => {
    setGitLoading(true);
    try {
      await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", path: cwd }),
      });
      await loadGitStatus();
    } catch { /* ignore */ }
    setGitLoading(false);
  };

  const gitCommit = async () => {
    if (!gitMessage.trim()) return;
    setGitLoading(true);
    try {
      const res = await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", message: gitMessage, path: cwd }),
      });
      const data = await res.json();
      if (data.success) {
        setGitMessage("");
      }
      await loadGitStatus();
    } catch { /* ignore */ }
    setGitLoading(false);
  };

  const gitPush = async () => {
    setGitLoading(true);
    try {
      await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push", path: cwd }),
      });
      await loadGitStatus();
    } catch { /* ignore */ }
    setGitLoading(false);
  };

  // ─── Selected project info ──────────────────────────────────
  const selectedProject = allProjects.find(p => p.project.id === selectedProjectId);

  // ─── Panels config ──────────────────────────────────────────
  const panels: { key: Panel; label: string; icon: string }[] = [
    { key: "terminal", label: "Terminal", icon: "terminal" },
    { key: "files", label: "Files", icon: "folder" },
    { key: "git", label: "Git", icon: "commit" },
  ];

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-display-small text-md-on-surface">Workspace</h1>
            <p className="text-body-large text-md-on-surface-variant mt-0.5">
              Terminal &middot; File Explorer &middot; Git &middot; AI Context
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl">
              <button
                onClick={() => setWorkspaceMode("misc")}
                className={`px-3 py-1.5 rounded-lg text-label-medium font-medium transition-colors ${
                  workspaceMode === "misc" ? "bg-md-primary text-md-on-primary" : "text-md-on-surface-variant hover:bg-md-on-surface/5"
                }`}
              >
                Misc
              </button>
              <button
                onClick={() => setWorkspaceMode("project")}
                className={`px-3 py-1.5 rounded-lg text-label-medium font-medium transition-colors ${
                  workspaceMode === "project" ? "bg-md-primary text-md-on-primary" : "text-md-on-surface-variant hover:bg-md-on-surface/5"
                }`}
              >
                Project
              </button>
            </div>

            {/* Misc root selector */}
            {workspaceMode === "misc" && (
              <select
                value={miscRoot}
                onChange={e => {
                  setMiscRoot(e.target.value);
                  setSelectedProjectId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-md-surface-container text-md-on-surface text-sm border border-md-outline-variant focus:outline-none focus:ring-2 focus:ring-md-primary"
              >
                <option value="/workspace/misc">/workspace/misc</option>
                <option value="/workspace/experiments">/workspace/experiments</option>
                <option value="/workspace/scripts">/workspace/scripts</option>
                <option value="/workspace/notes">/workspace/notes</option>
                <option value="/app">/app (project root)</option>
              </select>
            )}

            {/* Project selector */}
            {workspaceMode === "project" && (
              <select
                value={selectedProjectId || ""}
                onChange={e => setSelectedProjectId(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg bg-md-surface-container text-md-on-surface text-sm border border-md-outline-variant focus:outline-none focus:ring-2 focus:ring-md-primary min-w-[200px]"
              >
                <option value="">Select a project...</option>
                {allProjects.map(p => (
                  <option key={p.project.id} value={p.project.id}>
                    {p.client.name} — {p.project.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Active project info */}
        {selectedProject && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-md-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded text-28 text-md-on-primary-container">folder</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-headline-small text-md-on-surface">{selectedProject.project.name}</h2>
                    <Badge variant="primary-tonal">{selectedProject.client.name}</Badge>
                    {selectedProject.project.githubRepos && selectedProject.project.githubRepos.length > 0 && (
                      <Badge variant="secondary-outlined">
                        <span className="material-symbols-rounded text-14 align-middle">code</span>
                        {selectedProject.project.githubRepos?.join(", ")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-body-medium text-md-on-surface-variant mt-1">{selectedProject.project.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Panel tabs */}
        <div className="flex gap-1 p-1 bg-md-surface-container-low rounded-xl mb-4 overflow-x-auto">
          {panels.map(panel => (
            <button
              key={panel.key}
              onClick={() => setActivePanel(panel.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-label-medium font-medium transition-colors whitespace-nowrap ${
                activePanel === panel.key
                  ? "bg-md-primary text-md-on-primary shadow-elevation-1"
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
          {/* ─── Main Panel ──────────────────────────────────── */}
          <div className="lg:col-span-3">
            {/* ─── Terminal ────────────────────────────────── */}
            {activePanel === "terminal" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">terminal</span>
                        Terminal
                      </CardTitle>
                      <CardDescription>Working directory: {cwd}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="text" size="sm" onClick={() => setTerminalLines([])}>
                        <span className="material-symbols-rounded text-18">clear_all</span>
                        Clear
                      </Button>
                      <Button variant="text" size="sm" onClick={() => {
                        setCommandInput(`pwd`);
                        executeCommand("pwd");
                      }}>
                        <span className="material-symbols-rounded text-18">home</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Output */}
                  <div
                    ref={terminalRef}
                    className="bg-[#1a1b26] rounded-xl p-4 h-[520px] overflow-y-auto font-mono text-sm leading-relaxed"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {terminalLines.map((line) => (
                      <div key={line.id} className="whitespace-pre-wrap break-all">
                        {line.type === "input" && <div className="text-[#7aa2f7]">{line.content}</div>}
                        {line.type === "output" && <div className="text-[#a9b1d6]">{line.content}</div>}
                        {line.type === "error" && <div className="text-[#f7768e]">{line.content}</div>}
                        {line.type === "info" && <div className="text-[#7aa2f7]">{line.content}</div>}
                        {line.type === "system" && <div className="text-[#565f89]">{line.content}</div>}
                      </div>
                    ))}
                    {isRunning && <div className="text-[#565f89] animate-pulse">...</div>}
                  </div>

                  {/* Command input */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[#7aa2f7] font-mono text-sm">❯</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={commandInput}
                      onChange={e => setCommandInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isRunning}
                      placeholder="Enter a command (↑/↓ for history)..."
                      className="flex-1 bg-transparent text-[#a9b1d6] font-mono text-sm placeholder:text-[#565f89] focus:outline-none disabled:opacity-50"
                      autoFocus
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
                    {(() => {
                      const cmds = workspaceMode === "project" && selectedProject
                        ? [`cd ${cwd}`, "ls -la", "git status", "git log --oneline -10", "find . -name '*.tsx' -o -name '*.ts' | head -20"]
                        : ["pwd", "ls -la", "tree -L 2 -I node_modules", "git status", "git log --oneline -5"];
                      return cmds.map(cmd => (
                        <button
                          key={cmd}
                          onClick={() => executeCommand(cmd)}
                          disabled={isRunning}
                          className="px-3 py-1.5 rounded-full text-xs font-mono bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50"
                        >
                          {cmd}
                        </button>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Files ───────────────────────────────────── */}
            {activePanel === "files" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">folder</span>
                        File Explorer
                      </CardTitle>
                      <CardDescription>{currentPath}</CardDescription>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="text" size="sm" onClick={() => { setShowNewFile(true); setNewFileName(""); }}>
                        <span className="material-symbols-rounded text-18">add_circle</span>
                        New File
                      </Button>
                      <Button variant="text" size="sm" onClick={() => { setShowNewDir(true); setNewFileName(""); }}>
                        <span className="material-symbols-rounded text-18">create_new_folder</span>
                        New Folder
                      </Button>
                      <Button variant="text" size="sm" onClick={() => { setFileContent(null); loadFileTree(); }}>
                        <span className="material-symbols-rounded text-18">refresh</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Create file/dir modals inline */}
                  {showNewFile && (
                    <div className="flex gap-2 mb-3 p-3 rounded-xl bg-md-secondary-container/50">
                      <Input placeholder="filename.txt" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") setShowNewFile(false); }} />
                      <Button variant="filled" size="sm" onClick={createFile}>Create</Button>
                      <Button variant="text" size="sm" onClick={() => setShowNewFile(false)}>Cancel</Button>
                    </div>
                  )}
                  {showNewDir && (
                    <div className="flex gap-2 mb-3 p-3 rounded-xl bg-md-secondary-container/50">
                      <Input placeholder="folder-name" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createDirectory(); if (e.key === "Escape") setShowNewDir(false); }} />
                      <Button variant="filled" size="sm" onClick={createDirectory}>Create</Button>
                      <Button variant="text" size="sm" onClick={() => setShowNewDir(false)}>Cancel</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File list */}
                    <div>
                      <div className="bg-md-surface-container-low rounded-xl p-2 h-[520px] overflow-y-auto">
                        {fileLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <span className="h-6 w-6 animate-spin rounded-full border-2 border-md-primary border-r-transparent" />
                          </div>
                        ) : (
                          <div>
                            {/* Parent directory */}
                            {(() => {
                              const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || "/";
                              if (parent !== currentPath) {
                                return (
                                  <button
                                    key="parent"
                                    onClick={() => loadFileTree(parent)}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm"
                                  >
                                    <span className="material-symbols-rounded text-18">arrow_back</span>
                                    ..
                                  </button>
                                );
                              }
                              return null;
                            })()}

                            {fileTree
                              .filter(f => f.type === "directory")
                              .map(f => (
                                <div key={f.path} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm group">
                                  <button
                                    onClick={() => loadFileTree(f.path)}
                                    className="flex items-center gap-2 flex-1 text-left text-md-on-surface hover:bg-md-on-surface/5 rounded-lg py-1 px-1"
                                  >
                                    <span className="material-symbols-rounded text-20 text-md-primary">folder</span>
                                    {f.name}
                                  </button>
                                  <button onClick={() => setShowDelete(f.path)}
                                    className="opacity-0 group-hover:opacity-100 text-md-on-surface-variant hover:text-md-on-error transition-opacity p-1"
                                    title="Delete">
                                    <span className="material-symbols-rounded text-16">delete</span>
                                  </button>
                                </div>
                              ))}
                            {fileTree
                              .filter(f => f.type === "file")
                              .slice(0, 100)
                              .map(f => (
                                <div key={f.path} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm group">
                                  <button
                                    onClick={() => readFile(f.path)}
                                    className="flex items-center gap-2 flex-1 text-left text-md-on-surface-variant hover:bg-md-on-surface/5 rounded-lg py-1 px-1"
                                  >
                                    <span className="material-symbols-rounded text-20">description</span>
                                    {f.name}
                                  </button>
                                  <button onClick={() => setShowDelete(f.path)}
                                    className="opacity-0 group-hover:opacity-100 text-md-on-surface-variant hover:text-md-on-error transition-opacity p-1"
                                    title="Delete">
                                    <span className="material-symbols-rounded text-16">delete</span>
                                  </button>
                                </div>
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
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-label-medium text-md-on-surface-variant font-medium">{fileContent.name}</p>
                          <div className="flex gap-1">
                            <Button variant="text" size="sm" onClick={() => navigator.clipboard.writeText(fileContent.content)}>
                              <span className="material-symbols-rounded text-16">content_copy</span>
                            </Button>
                            <Button variant="text" size="sm" onClick={() => setFileContent(null)}>
                              <span className="material-symbols-rounded text-16">close</span>
                            </Button>
                          </div>
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

            {/* ─── Git ─────────────────────────────────────── */}
            {activePanel === "git" && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-md-primary">commit</span>
                        Git Operations
                      </CardTitle>
                      <CardDescription>
                        Path: {cwd} {gitStatus?.branch && `&middot; Branch: ${gitStatus.branch}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {/* Repo selector */}
                      {repos.length > 0 && (
                        <select
                          value={selectedRepo}
                          onChange={e => { setSelectedRepo(e.target.value); loadGitStatus(e.target.value || undefined); }}
                          className="px-2 py-1.5 rounded-lg bg-md-surface-container text-md-on-surface text-xs border border-md-outline-variant"
                        >
                          <option value="">Current path</option>
                          {repos.map(r => <option key={r.name} value={r.path}>{r.name}</option>)}
                        </select>
                      )}
                      <Button variant="text" size="sm" onClick={() => loadGitStatus(selectedRepo || undefined)}>
                        <span className="material-symbols-rounded text-18">refresh</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Commit controls */}
                  <div className="flex gap-2 mb-4 flex-wrap">
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
                          <Badge variant="secondary-outlined" className="font-mono text-xs shrink-0">{c.sha.slice(0, 7)}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-medium text-md-on-surface truncate">{c.message}</p>
                            <p className="text-body-small text-md-on-surface-variant">{c.author} &middot; {c.date}</p>
                          </div>
                        </div>
                      ))}
                      {gitLog.length === 0 && (
                        <p className="text-center py-6 text-body-medium text-md-on-surface-variant">No commits found</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ─── Sidebar ───────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>Workspace</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex justify-between">
                  <span className="text-body-medium text-md-on-surface-variant">Mode</span>
                  <Badge variant={workspaceMode === "misc" ? "secondary-tonal" : "primary-tonal"}>
                    {workspaceMode === "misc" ? "Misc" : "Project"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-body-medium text-md-on-surface-variant">Path</span>
                  <span className="text-body-medium font-medium text-md-on-surface text-xs font-mono">{cwd}</span>
                </div>
                {selectedProject && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-body-medium text-md-on-surface-variant">Project</span>
                      <span className="text-body-medium font-medium text-md-on-surface">{selectedProject.project.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-medium text-md-on-surface-variant">Client</span>
                      <span className="text-body-medium font-medium text-md-on-surface">{selectedProject.client.name}</span>
                    </div>
                    {selectedProject.project.githubRepos && selectedProject.project.githubRepos.length > 0 && (
                      <div>
                        <span className="text-body-medium text-md-on-surface-variant">Repos</span>
                        <div className="mt-1 space-y-1">
                          {selectedProject.project.githubRepos?.map(r => (
                            <a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-body-small text-md-primary hover:underline">
                              <span className="material-symbols-rounded text-14">open_in_new</span>
                              {r}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick commands */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                {(() => {
                  const actions = workspaceMode === "project" && selectedProject
                    ? [
                        { label: "List Files", cmd: "ls -la" },
                        { label: "Git Status", cmd: "git status --short" },
                        { label: "Git Log", cmd: "git log --oneline -10" },
                        { label: "Find TSX", cmd: "find . -name '*.tsx' | head -20" },
                        { label: "Build", cmd: "npm run build" },
                        { label: "Type Check", cmd: "npx tsc --noEmit" },
                      ]
                    : [
                        { label: "Create Dir", cmd: `mkdir -p ${miscRoot}/new-folder` },
                        { label: "List Files", cmd: `ls -la ${miscRoot}` },
                        { label: "Make Script", cmd: `touch ${miscRoot}/script.sh && chmod +x ${miscRoot}/script.sh` },
                        { label: "Make Note", cmd: `touch ${miscRoot}/notes.md` },
                      ];
                  return actions.map(q => (
                    <button
                      key={q.label}
                      onClick={() => {
                        setActivePanel("terminal");
                        executeCommand(q.cmd);
                      }}
                      disabled={isRunning}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-md-surface-container-high hover:bg-md-surface-container-highest text-body-medium text-md-on-surface transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-rounded text-16 align-middle text-md-primary">play_arrow</span>
                      {q.label}
                    </button>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* All projects quick nav */}
            <Card>
              <CardHeader className="pb-2"><CardTitle>All Projects</CardTitle></CardHeader>
              <CardContent className="pt-0 max-h-[300px] overflow-y-auto">
                <div className="space-y-1.5">
                  {allProjects.map(p => (
                    <button
                      key={p.project.id}
                      onClick={() => {
                        setWorkspaceMode("project");
                        setSelectedProjectId(p.project.id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedProjectId === p.project.id
                          ? "bg-md-primary-container text-md-on-primary-container"
                          : "hover:bg-md-on-surface/5 text-md-on-surface"
                      }`}
                    >
                      <p className="text-body-medium font-medium">{p.project.name}</p>
                      <p className="text-body-small text-md-on-surface-variant">{p.client.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDelete(null)}>
            <Card className="w-[400px] mx-4" onClick={e => e.stopPropagation()}>
              <CardHeader><CardTitle>Delete Item</CardTitle></CardHeader>
              <CardContent>
                <p className="text-body-medium text-md-on-surface-variant mb-4">
                  Are you sure you want to delete <code className="bg-md-surface-container-high px-2 py-0.5 rounded text-sm">{showDelete.split('/').pop()}</code>? This cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="text" onClick={() => setShowDelete(null)}>Cancel</Button>
                  <Button variant="filled" className="bg-[#b71c1c] text-white hover:bg-[#d32f2f]" onClick={() => deleteItem(showDelete)}>
                    <span className="material-symbols-rounded text-18 mr-1">delete</span>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
