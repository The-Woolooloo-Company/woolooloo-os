"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function XtermTerminal() {
  const [sid, setSid] = useState("");
  const [output, setOutput] = useState("root@woolooloo:/app$ ");
  const [curr, setCurr] = useState("");
  const posRef = useRef(0);
  const polRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const prompt = "root@woolooloo:/app$ ";

  useEffect(() => {
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "create" }),
    })
      .then((r) => r.json())
      .then((j) => {
        setSid(j.sessionId);
        setTimeout(() => taRef.current?.focus(), 200);
      });
    return () => {
      if (sid) fetch("/api/terminal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid }) }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!sid) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/terminal?sessionId=${sid}&pos=${posRef.current}`);
        const d = await r.text();
        if (r.ok && d) {
          posRef.current += d.length;
          setOutput((prev) => prev + d.replace(/___EOF___/g, ""));
        }
      } catch {}
      polRef.current = setTimeout(poll, 100);
    };
    poll();
    return () => clearTimeout(polRef.current);
  }, [sid]);

  useEffect(() => {
    displayRef.current?.scrollTo(0, displayRef.current.scrollHeight);
  }, [output, curr]);

  const send = useCallback((data: string) => {
    if (!sid) return;
    fetch("/api/terminal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid, type: "input", data }) }).catch(() => {});
  }, [sid]);

  const handleTextChange = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const val = ta.value;
    const prev = prevVal.current;
    if (val.length > prev.length) {
      send(val.slice(prev.length));
    } else if (val.length < prev.length) {
      // Backspace was pressed
      const deleted = prev.length - val.length;
      for (let i = 0; i < deleted; i++) send("\x7f");
    }
    prevVal.current = val;
    setCurr(val);
  }, [send]);

  const prevVal = useRef("");

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current!;
    if (e.key === "Enter") {
      e.preventDefault();
      send("\n");
      setOutput((prev) => prev + curr + "\n" + prompt);
      ta.value = "";
      prevVal.current = "";
      setCurr("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      send("\t");
    } else if (e.key === "Escape") {
      e.preventDefault();
      send("\x1b");
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      send("\x03");
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setOutput(prompt);
      ta.value = "";
      prevVal.current = "";
      setCurr("");
    }
  }, [curr, send]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e2e", position: "relative", cursor: "text" }} onClick={() => taRef.current?.focus()}>
      <div ref={displayRef} style={{ padding: 8, fontFamily: "monospace", fontSize: 14, color: "#cdd6f4", whiteSpace: "pre-wrap", height: "100%", overflow: "auto" }}>
        {output}{curr}<span style={{ color: "#f5e0dc" }}>▌</span>
      </div>
      <textarea ref={taRef} onInput={handleTextChange} onKeyDown={handleKeyDown} style={{ position: "absolute", left: "-9999px", top: 0, width: 1, height: 1, opacity: 0, border: "none", outline: "none", cursor: "text", resize: "none" }} autoFocus spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" />
    </div>
  );
}
