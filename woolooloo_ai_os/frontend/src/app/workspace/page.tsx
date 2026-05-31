"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllProjects, seedMockClients } from "@/lib/clients";
import { PiHarness } from "@/components/pi-harness";

// ─── Types ─────────────────────────────────────────────────────

type Panel = "pi" | "terminal" | "files" | "git";

// ─── Workspace Page ──────────────────────────────────────────────

export default function WorkspacePage() {
  const [activePanel, setActivePanel] = useState<Panel>("pi");
  const [allProjects] = useState(() => { seedMockClients(); return getAllProjects(); });

  // ─── Terminal State ──────────────────────────────────────────
  const [terminalLines, setTerminalLines] = useState<{ id: number; type: "input" | "output" | "error" | "info" | "system"; content: string; timestamp: number }[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [cwd, setCwd] = useState("/app");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineId = useRef(0);

  // ─── Files State ─────────────────────────────────────────────
  const [fileTree, setFileTree] = useState<{ name: string; type: string; path: string }[]>([]);
  const [currentPath, setCurrentPath] = useState("/app");
  const [fileContent, setFileContent] = useState<{ path: string; name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // ─── Git State ───────────────────────────────────────────────
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [gitLog, setGitLog] = useState<any[]>([]);
  const [gitMessage, setGitMessage] = useState("");
  const [gitLoading, setGitLoading] = useState(false);

  // ─── Initialize terminal ─────────────────────────────────────
  useEffect(() => {
    setTerminalLines([{
      id: lineId.current++,
      type: "system",
      content: ` Woolooloo OS Workspace — ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
    }, {
      id: lineId.current++,
      type: "info",
      content: ` Path: /app`,
      timestamp: Date.now(),
    }]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // ─── Execute command ────────────────────────────────────────
  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalLines(prev => [...prev, { id: lineId.current++, type: "input", content: `❯ ${cmd}`, timestamp: Date.now() }]);
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
              setTerminalLines(prev => [...prev, { id: lineId.current++, type: "output", content, timestamp: Date.now() }]);
            }
          } else if (rawLine.startsWith('err:')) {
            setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: rawLine.slice(4), timestamp: Date.now() }]);
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
          if (content.trim()) setTerminalLines(prev => [...prev, { id: lineId.current++, type: "output", content, timestamp: Date.now() }]);
        } else if (buffer.startsWith('err:')) {
          setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: buffer.slice(4), timestamp: Date.now() }]);
        }
      }
    } catch (err: any) {
      setTerminalLines(prev => [...prev, { id: lineId.current++, type: "error", content: err.message, timestamp: Date.now() }]);
    }

    setIsRunning(false);
    setCommandInput("");
  }, [cwd]);

  // ─── Handle keyboard ────────────────────────────────────────
  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand(commandInput);
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
        setFileTree(data.entries.map((e: any) => ({ name: e.name, type: e.type, path: e.path })));
        setCurrentPath(targetPath);
        setCwd(targetPath);
      }
    } catch { /* ignore */ }
    setFileLoading(false);
  };

  const readFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/files?action=read&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content) setFileContent({ path: data.path, name: data.name, content: data.content });
    } catch { /* ignore */ }
  };

  useEffect(() => { loadFileTree(); }, []);

  // ─── Git operations ─────────────────────────────────────────
  const loadGitStatus = async () => {
    try {
      const [statusRes, logRes] = await Promise.all([
        fetch(`/api/workspace/git?op=status&path=${encodeURIComponent(cwd)}`),
        fetch(`/api/workspace/git?op=log&count=10&path=${encodeURIComponent(cwd)}`),
      ]);
      setGitStatus(await statusRes.json());
      setGitLog((await logRes.json()).commits || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadGitStatus(); }, [cwd]);

  // ─── Panels config ──────────────────────────────────────────
  const panels: { key: Panel; label: string; icon: string }[] = [
    { key: "pi", label: "Pi Harness", icon: "api" },
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
              Pi Harness · Terminal · Files · Git
            </p>
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
                  ? "bg-md-primary text-md-on-primary shadow-elevation-1"
                  : "text-md-on-surface-variant hover:bg-md-on-surface/5"
              }`}
            >
              <span className="material-symbols-rounded text-18">{panel.icon}</span>
              {panel.label}
            </button>
          ))}
        </div>

        {/* ─── Pi Harness (default) ──────────────────────────── */}
        {activePanel === "pi" && (
          <PiHarness />
        )}

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
                  <CardDescription>Working directory: {cwd}</CardDescription>
                </div>
                <Button variant="text" size="sm" onClick={() => setTerminalLines([])}>
                  <span className="material-symbols-rounded text-18">clear_all</span>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={terminalRef} className="bg-[#1a1b26] rounded-xl p-4 h-[520px] overflow-y-auto font-mono text-sm leading-relaxed" onClick={() => inputRef.current?.focus()}>
                {terminalLines.map(line => (
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

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[#7aa2f7] font-mono text-sm">❯</span>
                <input ref={inputRef} type="text" value={commandInput} onChange={e => setCommandInput(e.target.value)}
                  onKeyDown={handleTerminalKeyDown} disabled={isRunning}
                  placeholder="Enter a command..."
                  className="flex-1 bg-transparent text-[#a9b1d6] font-mono text-sm placeholder:text-[#565f89] focus:outline-none disabled:opacity-50" autoFocus />
                <Button variant="filled" size="sm" onClick={() => executeCommand(commandInput)} disabled={isRunning || !commandInput.trim()}>
                  {isRunning ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <span className="material-symbols-rounded text-18">play_arrow</span>}
                  Run
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {["pwd", "ls -la", "git status", "git log --oneline -10", "tree -L 2 -I node_modules"].map(cmd => (
                  <button key={cmd} onClick={() => executeCommand(cmd)} disabled={isRunning}
                    className="px-3 py-1.5 rounded-full text-xs font-mono bg-md-surface-container-high text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors disabled:opacity-50">
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-md-primary">folder</span>
                    File Explorer
                  </CardTitle>
                  <CardDescription>{currentPath}</CardDescription>
                </div>
                <Button variant="text" size="sm" onClick={() => { setFileContent(null); loadFileTree(); }}>
                  <span className="material-symbols-rounded text-18">refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="bg-md-surface-container-low rounded-xl p-2 h-[520px] overflow-y-auto">
                    {fileLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-md-primary border-r-transparent" />
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || "/";
                          if (parent !== currentPath) {
                            return (
                              <button key="parent" onClick={() => loadFileTree(parent)}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm">
                                <span className="material-symbols-rounded text-18">arrow_back</span> ..
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {fileTree.filter(f => f.type === "directory").map(f => (
                          <button key={f.path} onClick={() => loadFileTree(f.path)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-on-surface/5">
                            <span className="material-symbols-rounded text-20 text-md-primary">folder</span> {f.name}
                          </button>
                        ))}
                        {fileTree.filter(f => f.type === "file").slice(0, 100).map(f => (
                          <button key={f.path} onClick={() => readFile(f.path)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-md-on-surface-variant hover:bg-md-on-surface/5">
                            <span className="material-symbols-rounded text-20">description</span> {f.name}
                          </button>
                        ))}
                        {fileTree.length === 0 && <p className="text-center text-body-medium text-md-on-surface-variant py-8">Empty directory</p>}
                      </div>
                    )}
                  </div>
                </div>
                {fileContent && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-label-medium text-md-on-surface-variant font-medium">{fileContent.name}</p>
                      <Button variant="text" size="sm" onClick={() => setFileContent(null)}>
                        <span className="material-symbols-rounded text-16">close</span>
                      </Button>
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-md-primary">commit</span>
                    Git Operations
                  </CardTitle>
                  <CardDescription>Path: {cwd} {gitStatus?.branch && `· Branch: ${gitStatus.branch}`}</CardDescription>
                </div>
                <Button variant="text" size="sm" onClick={loadGitStatus}>
                  <span className="material-symbols-rounded text-18">refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 flex-wrap">
                <Input placeholder="Commit message..." value={gitMessage} onChange={e => setGitMessage(e.target.value)} className="flex-1" />
                <Button variant="outlined" size="sm" onClick={async () => {
                  setGitLoading(true);
                  try {
                    await fetch("/api/workspace/git", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", path: cwd }) });
                    await loadGitStatus();
                  } catch { /* ignore */ }
                  setGitLoading(false);
                }} disabled={gitLoading}>
                  <span className="material-symbols-rounded text-18">add</span> Add All
                </Button>
                <Button variant="filled" size="sm" onClick={async () => {
                  if (!gitMessage.trim()) return;
                  setGitLoading(true);
                  try {
                    await fetch("/api/workspace/git", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "commit", message: gitMessage, path: cwd }) });
                    setGitMessage("");
                    await loadGitStatus();
                  } catch { /* ignore */ }
                  setGitLoading(false);
                }} disabled={gitLoading || !gitMessage.trim()}>
                  <span className="material-symbols-rounded text-18">commit</span> Commit
                </Button>
                <Button variant="outlined" size="sm" onClick={async () => {
                  setGitLoading(true);
                  try {
                    await fetch("/api/workspace/git", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "push", path: cwd }) });
                    await loadGitStatus();
                  } catch { /* ignore */ }
                  setGitLoading(false);
                }} disabled={gitLoading}>
                  <span className="material-symbols-rounded text-18">cloud_upload</span> Push
                </Button>
              </div>

              {gitStatus?.status && (
                <div className="mb-4">
                  <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">Changes</p>
                  <div className="bg-md-surface-container-low rounded-xl p-3">
                    <pre className="text-sm font-mono text-md-on-surface whitespace-pre-wrap break-all">{gitStatus.status || "No changes"}</pre>
                  </div>
                </div>
              )}

              <div>
                <p className="text-label-medium text-md-on-surface-variant font-medium mb-2">Recent Commits</p>
                <div className="bg-md-surface-container-low rounded-xl divide-y divide-md-outline-variant/25">
                  {gitLog.map((c: any) => (
                    <div key={c.sha} className="px-4 py-3 flex items-center gap-3">
                      <Badge variant="secondary-outlined" className="font-mono text-xs shrink-0">{c.sha.slice(0, 7)}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-medium text-md-on-surface truncate">{c.message}</p>
                        <p className="text-body-small text-md-on-surface-variant">{c.author} · {c.date}</p>
                      </div>
                    </div>
                  ))}
                  {gitLog.length === 0 && <p className="text-center py-6 text-body-medium text-md-on-surface-variant">No commits found</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
