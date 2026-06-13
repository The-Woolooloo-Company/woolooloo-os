"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "@xterm/xterm/css/xterm.css";

const CATPUCCIN = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  selectionBackground: "#585b70",
  black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
  blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
  brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af", brightBlue: "#89b4fa", brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5", brightWhite: "#a6adc8",
};

export function XtermTerminal() {
  const innerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [msg, setMsg] = useState("");
  const sessionIdRef = useRef("");
  const pollingRef = useRef(0);
  const termRef = useRef<any>(null);
  const isReadyRef = useRef(false);

  const sendKey = useCallback((data: string) => {
    if (!sessionIdRef.current) return;
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        type: "input",
        data,
      }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let disposed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReadyRef.current) return;

      const key = e.key;

      // Special keys
      if (key === "Enter") { e.preventDefault(); sendKey("\r"); return; }
      if (key === "Backspace") { e.preventDefault(); sendKey("\x7f"); return; }
      if (key === "Tab") { e.preventDefault(); sendKey("\t"); return; }
      if (key === "Escape") { e.preventDefault(); sendKey("\x1b"); return; }
      if (key === "Delete") { e.preventDefault(); sendKey("\x1b[3~"); return; }
      if (key === "ArrowUp") { e.preventDefault(); sendKey("\x1b[A"); return; }
      if (key === "ArrowDown") { e.preventDefault(); sendKey("\x1b[B"); return; }
      if (key === "ArrowLeft") { e.preventDefault(); sendKey("\x1b[D"); return; }
      if (key === "ArrowRight") { e.preventDefault(); sendKey("\x1b[C"); return; }
      if (key === "Home") { e.preventDefault(); sendKey("\x1b[H"); return; }
      if (key === "End") { e.preventDefault(); sendKey("\x1b[F"); return; }

      // Ctrl+letter
      if (e.ctrlKey && !e.altKey && !e.metaKey && key.length === 1) {
        e.preventDefault();
        sendKey(String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64));
        return;
      }

      // Printable characters
      if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        sendKey(key);
        termRef.current?.write(key);
        return;
      }
    };

    async function init() {
      try {
        setStatus("loading");
        setMsg("Importing terminal...");

        const { Terminal } = await import("@xterm/xterm");
        if (disposed) return;
        const { FitAddon } = await import("@xterm/addon-fit");
        if (disposed) return;

        const term = new Terminal({
          theme: CATPUCCIN,
          fontFamily: '"Cascadia Code", "JetBrains Mono", monospace',
          fontSize: 14,
          cursorBlink: true,
          scrollback: 5000,
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(innerRef.current!);
        termRef.current = term;

        await new Promise((r) => requestAnimationFrame(r));
        fit.fit();

        window.addEventListener("resize", () => fit?.fit());

        setMsg("Connecting...");
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "create" }),
        });
        const json = await res.json();
        sessionIdRef.current = json.sessionId;
        isReadyRef.current = true;
        setStatus("ready");

        // Add global listener on capture phase - fires before everything else
        document.addEventListener("keydown", handleKeyDown, true);

        let lastPos = 0;
        const poll = async () => {
          try {
            const r = await fetch(
              `/api/terminal?sessionId=${sessionIdRef.current}&pos=${lastPos}`
            );
            const data = await r.text();
            if (r.ok && data) {
              lastPos += data.length;
              termRef.current?.write(data);
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
      isReadyRef.current = false;
      clearTimeout(pollingRef.current);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (sessionIdRef.current) {
        fetch("/api/terminal", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => {});
      }
      termRef.current?.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e2e", position: "relative" }}>
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: status === "error" ? "#f38ba8" : "#71717a",
            fontSize: "14px",
            padding: "16px",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg || "Starting terminal..."}
        </div>
      )}
      <div ref={innerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
