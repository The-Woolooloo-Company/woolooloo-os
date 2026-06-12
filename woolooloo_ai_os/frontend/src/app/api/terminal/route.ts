import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";

interface Session {
  proc: ChildProcess;
  output: string;
}

const sessions = new Map<string, Session>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const pos = parseInt(request.nextUrl.searchParams.get("pos") || "0") || 0;

  if (!sessionId || !sessions.has(sessionId)) {
    return new Response("No session", { status: 400 });
  }

  const session = sessions.get(sessionId)!;
  const newOutput = session.output.slice(pos);
  return new Response(newOutput, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, sessionId, data } = body;

  if (type === "create") {
    const id = randomUUID();
    const cwd = process.env.WORKSPACE_ROOT || "/app";
    const proc = spawn("/bin/sh", ["-i"], {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        SHELL: "/bin/sh",
        LANG: "en_US.UTF-8",
        PS1: "\\u@woolooloo:\\w\\$ ",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Inject initial prompt
    setTimeout(() => {
      if (sessions.has(id)) {
        sessions.get(id)!.output = "root@woolooloo:/app$ \n";
      }
    }, 100);

    const session: Session = { proc, output: "" };
    proc.stdout!.on("data", (c: Buffer) => (session.output += c.toString()));
    proc.stderr!.on("data", (c: Buffer) => (session.output += c.toString()));
    proc.on("close", () => (session.output += "\n[Shell exited]\n"));

    sessions.set(id, session);
    return NextResponse.json({ sessionId: id });
  }

  if (type === "input" && sessionId && sessions.has(sessionId)) {
    sessions.get(sessionId)!.proc.stdin!.write(data);
    return NextResponse.json({ ok: true });
  }

  if (type === "resize") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { sessionId } = body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.get(sessionId)!.proc.kill();
    sessions.delete(sessionId);
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
