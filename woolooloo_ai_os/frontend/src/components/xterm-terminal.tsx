"use client";

import { useEffect, useRef, useState } from "react";

export function XtermTerminal() {
  const [sid, setSid] = useState("");
  const [out, setOut] = useState(["root@woolooloo:/app$ "]);
  const [buf, setBuf] = useState("");
  const pos = useRef(0);
  const bot = useRef<HTMLDivElement>(null);
  const pol = useRef(0);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/terminal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "create" }) })
      .then((r) => r.json())
      .then((j) => setSid(j.sessionId))
      .finally(() => setTimeout(() => ta.current?.focus(), 100));
  }, []);

  useEffect(() => {
    if (!sid) return;
    const go = async () => {
      try {
        const r = await fetch(`/api/terminal?sessionId=${sid}&pos=${pos.current}`);
        const d = await r.text();
        if (r.ok && d) {
          pos.current += d.length;
          setOut((p) => {
            const l = d.split("\n");
            const a = [...p];
            a[a.length - 1] += l[0] || "";
            for (let i = 1; i < l.length; i++) a.push(l[i]);
            return a;
          });
        }
        pol.current = setTimeout(go, 100) as any;
      } catch { pol.current = setTimeout(go, 1000) as any; }
    };
    go();
    return () => clearTimeout(pol.current);
  }, [sid]);

  useEffect(() => { bot.current?.scrollIntoView({ block: "end" }); }, [out, buf]);

  useEffect(() => {
    return () => {
      clearTimeout(pol.current);
      if (sid) fetch("/api/terminal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid }) }).catch(() => {});
    };
  }, [sid]);

  const send = (d: string) => {
    if (!sid) return;
    fetch("/api/terminal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid, type: "input", data: d }) }).catch(() => {});
  };

  const keyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") { e.preventDefault(); send("\n"); setOut((p) => [...p, "root@woolooloo:/app$ "]); setBuf(""); }
    else if (e.key === "Tab") { e.preventDefault(); send("\t"); }
    else if (e.key === "Escape") { e.preventDefault(); send("\x1b"); }
    else if (e.ctrlKey && e.key === "c") { e.preventDefault(); send("\x03"); }
  };

  const change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.length > buf.length) {
      const c = v.slice(-1);
      send(c);
    }
    setBuf(v);
  };

  const lines = [...out];
  const cur = lines.pop() || "";

  return (
    <div style={{ width: "100%", height: "100%", background: "#1e1e2e", position: "relative", fontFamily: "monospace", fontSize: 14, color: "#cdd6f4", overflow: "auto" }}>
      <div style={{ padding: 8, whiteSpace: "pre-wrap", minHeight: "100%" }}>
        {lines.map((l, i) => <div key={i}>{l}</div>)}
        <div>{cur}{buf}<span style={{ opacity: 0.7 }}>▌</span></div>
        <div ref={bot} />
      </div>
      <textarea ref={ta} value={buf} onChange={change} onKeyDown={keyDown} autoFocus spellCheck={false} autoComplete="off" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, resize: "none", border: "none", outline: "none", padding: 0, lineHeight: "normal", cursor: "text" }} />
    </div>
  );
}
