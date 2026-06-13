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
  const statusRef = useRef(false);
  const sessionIdRef = useRef("");
  const termRef = useRef<any>(null);
  const pollingRef = useRef(0);

  useEffect(() => {
    statusRef.current = status === "ready";
  }, [status]);

  const sendKey = useCallback((data: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, type: "input", data }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let disposed = false;

    const globalHandler = (e: KeyboardEvent) => {
      if (!statusRef.current || !sessionIdRef.current) return;

      const key = e.key;
      const ctrl = e.ctrlKey;
      const shift = e.shiftKey;

      // Always prevent default for terminal keys
      e.preventDefault();

      // Enter
      if (key === "Enter") {
        sendKey("\r");
        return;
      }
      // Backspace
      if (key === "Backspace") {
        sendKey("\x7f");
        return;
      }
      // Tab
      if (key === "Tab") {
        sendKey("\t");
        return;
      }
      // Escape
      if (key === "Escape") {
        sendKey("\x1b");
        return;
      }
      // Delete
      if (key === "Delete") {
        sendKey("\x1b[3~");
        return;
      }
      // Arrow keys
      if (key === "ArrowUp") { sendKey("\x1b[A"); return; }
      if (key === "ArrowDown") { sendKey("\x1b[B"); return; }
      if (key === "ArrowLeft") { sendKey("\x1b[D"); return; }
      if (key === "ArrowRight") { sendKey("\x1b[C"); return; }
      // Home / End
      if (key === "Home") { sendKey("\x1b[H"); return; }
      if (key === "End") { sendKey("\x1b[F"); return; }
      // Page Up / Page Down
      if (key === "PageUp") { sendKey("\x1b[5~"); return; }
      if (key === "PageDown") { sendKey("\x1b[6~"); return; }
      // F1-F12
      if (key.startsWith("F")) {
        const n = parseInt(key.slice(1));
        if (n >= 1 && n <= 4) sendKey(`\x1bOP`);
        else if (n >= 5 && n <= 8) sendKey(`\x1b[1${n - 4}~`);
        return;
      }
      // Ctrl + letter
      if (ctrl && key.length === 1 && !shift) {
        const code = key.toUpperCase().charCodeAt(0) - 64;
        if (code >= 1 && code <= 26) {
          sendKey(String.fromCharCode(code));
          return;
        }
      }
      // Ctrl + Shift + letter
      if (ctrl && key.length === 1 && shift) {
        sendKey("^" + key.toUpperCase());
        return;
      }
      // Alt + key (Meta key on macOS)
      if (e.altKey && !ctrl && key.length === 1) {
        sendKey("\x1b" + key);
        return;
      }
      // Printable characters
      if (key.length === 1 && !ctrl && !e.altKey && !e.metaKey) {
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
        setStatus("ready");

        // Add global listener in capture phase
        document.addEventListener("keydown", globalHandler, true);

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
      document.removeEventListener("keydown", globalHandler, true);
      if (sessionIdRef.current) {
        fetch("/api/terminal", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => {});
      }
      termRef.current?.dispose();
    };
  }, [sendKey]);

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
