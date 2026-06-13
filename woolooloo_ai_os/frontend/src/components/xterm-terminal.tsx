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

  const focusTerm = useCallback(() => {
    termRef.current?.focus();
  }, []);

  useEffect(() => {
    let disposed = false;

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
          convertEol: true,
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(innerRef.current!);
        termRef.current = term;

        await new Promise((r) => requestAnimationFrame(r));
        fit.fit();
        term.focus();

        // Send keystrokes to server
        term.onData((key: string) => {
          if (!sessionIdRef.current) return;
          fetch("/api/terminal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              type: "input",
              data: key,
            }),
          }).catch(() => {});
        });

        term.onKey(({ key, domEvent }: any) => {
          if (domEvent.ctrlKey && key === "l") {
            term.clear();
            domEvent.preventDefault();
          }
        });

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

        // Focus on next frame after status changes
        requestAnimationFrame(() => term.focus());

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
      style={{ width: "100%", height: "100%", background: "#1e1e2e", position: "relative" }}
      onClick={focusTerm}
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
