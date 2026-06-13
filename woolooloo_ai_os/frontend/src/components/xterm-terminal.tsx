"use client";

import { useEffect, useRef, useState } from "react";
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
  const termRef = useRef<any>(null);
  const pollingRef = useRef(0);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    let disposed = false;

    // Build the handler - it reads refs directly so no stale closure issues
    keyHandlerRef.current = (e: KeyboardEvent) => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      e.preventDefault();

      let seq = "";
      const key = e.key;
      const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;

      if (key === "Enter") seq = "\r";
      else if (key === "Backspace") seq = "\x7f";
      else if (key === "Tab") seq = "\t";
      else if (key === "Escape") seq = "\x1b";
      else if (key === "Delete") seq = "\x1b[3~";
      else if (key === "ArrowUp") seq = "\x1b[A";
      else if (key === "ArrowDown") seq = "\x1b[B";
      else if (key === "ArrowLeft") seq = "\x1b[D";
      else if (key === "ArrowRight") seq = "\x1b[C";
      else if (key === "Home") seq = "\x1b[H";
      else if (key === "End") seq = "\x1b[F";
      else if (key === "PageUp") seq = "\x1b[5~";
      else if (key === "PageDown") seq = "\x1b[6~";
      else if (ctrl && key.length === 1) {
        seq = String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64);
      }
      else if (key.length === 1 && !ctrl && !e.altKey && !e.metaKey) {
        seq = key;
      }
      else return;

      // Send to server
      fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, type: "input", data: seq }),
      }).catch(() => {});

      // Echo printable chars locally
      if (key.length === 1 && !ctrl) {
        termRef.current?.write(key);
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
        setStatus("ready");

        // Global listener on capture phase
        document.addEventListener("keydown", keyHandlerRef.current, true);

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
      clearTimeout(pollingRef.current);
      document.removeEventListener("keydown", keyHandlerRef.current, true);
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
