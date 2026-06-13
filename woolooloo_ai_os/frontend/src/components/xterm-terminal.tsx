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
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [msg, setMsg] = useState("");
  const sessionIdRef = useRef("");
  const pollingRef = useRef(0);
  const termRef = useRef<any>(null);

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

    // Global keyboard handler - always captures when this div should receive input
    const globalKeyDown = (e: KeyboardEvent) => {
      if (status !== "ready" || !sessionIdRef.current) return;
      if (document.activeElement !== outerRef.current) return;

      const key = e.key;

      // Always prevent default and stop propagation for terminal keys
      e.preventDefault();
      e.stopPropagation();

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
      // Arrows
      if (key === "ArrowUp") { sendKey("\x1b[A"); return; }
      if (key === "ArrowDown") { sendKey("\x1b[B"); return; }
      if (key === "ArrowLeft") { sendKey("\x1b[D"); return; }
      if (key === "ArrowRight") { sendKey("\x1b[C"); return; }
      // Home/End
      if (key === "Home") { sendKey("\x1b[H"); return; }
      if (key === "End") { sendKey("\x1b[F"); return; }
      // PageUp/PageDown
      if (key === "PageUp") { sendKey("\x1b[5~"); return; }
      if (key === "PageDown") { sendKey("\x1b[6~"); return; }
      // Ctrl combinations
      if (e.ctrlKey && key.length === 1) {
        sendKey(String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64));
        return;
      }
      // Printable characters
      if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
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

        // Add global listener so it always fires
        document.addEventListener("keydown", globalKeyDown, true);

        // Focus outer div so it can receive keyboard events
        requestAnimationFrame(() => outerRef.current?.focus());

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
      document.removeEventListener("keydown", globalKeyDown, true);
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
    <div
      ref={outerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#1e1e2e",
        position: "relative",
        cursor: "text",
      }}
      tabIndex={0}
      onClick={() => outerRef.current?.focus()}
    >
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
