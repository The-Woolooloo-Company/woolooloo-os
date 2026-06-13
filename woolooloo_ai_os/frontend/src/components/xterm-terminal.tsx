"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const PROMPT = "root@woolooloo:/app$ ";

export function XtermTerminal() {
  const [sessionId, setSessionId] = useState("");
  const [output, setOutput] = useState<string[]>([PROMPT]);
  const [buffer, setBuffer] = useState("");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [msg, setMsg] = useState("");
  const pollingRef = useRef(0);
  const posRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on output change
  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [output, buffer]);

  const sendInput = useCallback((data: string) => {
    if (!sessionId) return;
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type: "input", data }),
    }).catch(() => {});
  }, [sessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (status !== "ready") return;

      const { key, ctrlKey, altKey, metaKey } = e;

      // Enter - send newline, add new prompt line
      if (key === "Enter") {
        e.preventDefault();
        sendInput("\n");
        setOutput((prev) => [...prev, PROMPT]);
        setBuffer("");
        return;
      }

      // Backspace
      if (key === "Backspace") {
        e.preventDefault();
        if (buffer.length > 0) {
          sendInput("\x7f");
          setBuffer((prev) => prev.slice(0, -1));
        }
        return;
      }

      // Tab
      if (key === "Tab") {
        e.preventDefault();
        sendInput("\t");
        return;
      }

      // Escape
      if (key === "Escape") {
        e.preventDefault();
        sendInput("\x1b");
        return;
      }

      // Delete
      if (key === "Delete") {
        e.preventDefault();
        sendInput("\x1b[3~");
        return;
      }

      // Arrow keys
      if (key === "ArrowUp") { e.preventDefault(); sendInput("\x1b[A"); return; }
      if (key === "ArrowDown") { e.preventDefault(); sendInput("\x1b[B"); return; }
      if (key === "ArrowLeft") { e.preventDefault(); sendInput("\x1b[D"); return; }
      if (key === "ArrowRight") { e.preventDefault(); sendInput("\x1b[C"); return; }

      // Ctrl+C
      if (ctrlKey && key === "c") {
        e.preventDefault();
        sendInput("\x03");
        setOutput((prev) => [...prev, prev[prev.length - 1].replace(PROMPT, "") + "^C", PROMPT]);
        setBuffer("");
        return;
      }

      // Ctrl+L (clear)
      if (ctrlKey && key === "l") {
        e.preventDefault();
        setOutput([PROMPT]);
        setBuffer("");
        return;
      }

      // Printable characters
      if (key.length === 1 && !ctrlKey && !altKey && !metaKey) {
        e.preventDefault();
        sendInput(key);
        setBuffer((prev) => prev + key);
      }
    },
    [status, buffer, sessionId, sendInput]
  );

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        setStatus("loading");
        setMsg("Connecting...");

        // Create session
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "create" }),
        });
        const json = await res.json();
        setSessionId(json.sessionId);
        setStatus("ready");
        inputRef.current?.focus();

        // Poll for output
        const poll = async () => {
          try {
            const r = await fetch(
              `/api/terminal?sessionId=${json.sessionId}&pos=${posRef.current}`
            );
            const data = await r.text();
            if (r.ok && data) {
              posRef.current += data.length;
              // Parse output - split on ___EOF___ marker from shell script
              const parts = data.split("___EOF___");
              const output = parts[0] || "";
              if (output) {
                setOutput((prev) => {
                  const lines = output.split("\n");
                  const result = [...prev];
                  result[result.length - 1] += lines[0] || "";
                  for (let i = 1; i < lines.length; i++) {
                    result.push(lines[i]);
                  }
                  return result;
                });
              }
            }
            pollingRef.current = setTimeout(poll, 100) as any;
          } catch {
            if (!disposed) pollingRef.current = setTimeout(poll, 1000) as any;
          }
        };
        poll();
      } catch (err: any) {
        setStatus("error");
        setMsg(err.message || String(err));
      }
    }

    init();

    return () => {
      disposed = true;
      clearTimeout(pollingRef.current);
      if (sessionId) {
        fetch("/api/terminal", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
    };
  }, []);

  if (status !== "ready") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1e1e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: status === "error" ? "#f38ba8" : "#71717a",
          fontSize: "14px",
        }}
      >
        {msg || "Connecting..."}
      </div>
    );
  }

  // Build display: last line has cursor
  const displayLines = output.slice(0, -1);
  const lastLine = output[output.length - 1] || "";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1e1e2e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={outputRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px",
          fontFamily: '"Cascadia Code", "JetBrains Mono", monospace',
          fontSize: "14px",
          lineHeight: "1.4",
          color: "#cdd6f4",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {displayLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div>
          {lastLine}{buffer}<span style={{ color: "#f5e0dc" }}>▌</span>
        </div>
      </div>
      <input
        ref={inputRef}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    </div>
  );
}
