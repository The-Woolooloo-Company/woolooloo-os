"use client";

import { useEffect, useRef, useState } from "react";

export function XtermTerminal() {
  const [sid, setSid] = useState("");
  const [lines, setLines] = useState<string[]>(["root@woolooloo:/app$ "]);
  const [inp, setInp] = useState("");
  const posRef = useRef(0);
  const polRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const prompt = "root@woolooloo:/app$ ";

  // Init session on mount
  useEffect(() => {
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "create" }),
    })
      .then((r) => r.json())
      .then((j) => {
        setSid(j.sessionId);
        setTimeout(() => taRef.current?.focus(), 100);
      });

    return () => {
      if (sid) {
        fetch("/api/terminal", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => {});
      }
    };
  }, []);

  // Poll for output
  useEffect(() => {
    if (!sid) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/terminal?sessionId=${sid}&pos=${posRef.current}`);
        const d = await r.text();
        if (r.ok && d) {
          posRef.current += d.length;
          // Filter out ___EOF___ markers
          const clean = d.replace(/___EOF___/g, "");
          if (!clean) { polRef.current = setTimeout(poll, 100); return; }
          const newLines = clean.split("\n");
          setLines((prev) => {
            const arr = [...prev];
            arr[arr.length - 1] += newLines[0] || "";
            for (let i = 1; i < newLines.length; i++) arr.push(newLines[i]);
            return arr;
          });
        }
      } catch { /* ignore */ }
      polRef.current = setTimeout(poll, 100);
    };
    poll();
    return () => clearTimeout(polRef.current);
  }, [sid]);

  // Scroll to bottom
  useEffect(() => {
    const el = document.getElementById("term-bottom");
    el?.scrollIntoView({ block: "end" });
  }, [lines, inp]);

  // Send input to server
  const send = (data: string) => {
    if (!sid) return;
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, type: "input", data }),
    }).catch(() => {});
  };

  // Handle textarea changes (character input)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const diff = val.slice(inp.length);
    if (diff) send(diff);
    setInp(val);
  };

  // Handle special keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send("\n");
      setLines((prev) => [...prev, prev[prev.length - 1] + inp, prompt]);
      setInp("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      send("\t");
    } else if (e.key === "Escape") {
      e.preventDefault();
      send("\x1b");
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      send("\x03");
      setLines((prev) => [...prev.slice(0, -1), prev[prev.length - 1].replace(prompt + inp, "") + "^C", prompt]);
      setInp("");
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setLines([prompt]);
      setInp("");
    }
  };

  // Build display lines
  const display = [...lines];
  const last = display[display.length - 1] || "";

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e2e", display: "flex", flexDirection: "column", fontFamily: '"Cascadia Code", "JetBrains Mono", monospace', fontSize: "14px", color: "#cdd6f4", position: "relative" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
        {display.slice(0, -1).map((l, i) => <div key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</div>)}
        <div style={{ whiteSpace: "pre-wrap" }}>{last}{inp}<span style={{ color: "#f5e0dc" }}>▌</span></div>
        <div id="term-bottom" />
      </div>
      <textarea
        ref={taRef}
        value={inp}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{ position: "absolute", left: "-9999px", top: 0, width: "1px", height: "1px", opacity: 0, border: "none", outline: "none", cursor: "text" }}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
