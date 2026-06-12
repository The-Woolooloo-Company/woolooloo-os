"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface XtermTerminalProps {
  className?: string;
}

const CATPUCCIN_MOCHA = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  cursorAccent: "#1e1e2e",
  selectionBackground: "#585b70",
  selectionForeground: "#cdd6f4",
  black: "#45475a",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#f5c2e7",
  cyan: "#94e2d5",
  white: "#bac2de",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#a6adc8",
};

export function XtermTerminal({ className = "" }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("");

  const sendInput = useCallback((data: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type: "input", data }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: CATPUCCIN_MOCHA,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    term.onData((data) => sendInput(data));

    term.onKey(({ key, domEvent }) => {
      if (domEvent.ctrlKey && domEvent.key === "l") {
        term.clear();
        domEvent.preventDefault();
      }
    });

    const handleResize = () => {
      if (fitAddon && sessionIdRef.current) {
        fitAddon.fit();
        fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }),
        }).catch(() => {});
      }
    };
    window.addEventListener("resize", handleResize);

    // Create session
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "create" }),
    })
      .then((r) => r.json())
      .then(({ sessionId }) => {
        sessionIdRef.current = sessionId;

        // Connect SSE stream
        const evtSource = new EventSource(`/api/terminal?sessionId=${sessionId}`);
        evtSource.onmessage = (event) => {
          const data = event.data;
          if (data.startsWith("session=")) return;
          term.write(data);
        };
        evtSource.onerror = () => evtSource.close();
      })
      .catch(() => {
        term.writeln("Failed to create terminal session");
      });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (sessionIdRef.current) {
        fetch("/api/terminal", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => {});
      }
      term.dispose();
    };
  }, [sendInput]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#1e1e2e] overflow-hidden ${className}`}
    />
  );
}
