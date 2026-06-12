// Simple terminal via child_process (no node-pty needed)
// POST /api/terminal — start session / send input / resize
// GET  /api/terminal — SSE stream for terminal output
// DELETE /api/terminal — close session

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

const sessions = new Map<string, { proc: any; paused: boolean }>();

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId || !sessions.has(sessionId)) {
    return new NextResponse("No session", { status: 400 });
  }

  const { proc } = sessions.get(sessionId)!;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: session=${sessionId}\n\n`));

      proc.stdout.on("data", (data: Buffer) => {
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      });
      proc.stderr.on("data", (data: Buffer) => {
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      });
      proc.on("close", (code: number) => {
        controller.enqueue(new TextEncoder().encode(`data: [Process exited with code ${code}]\n\n`));
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, sessionId, data, cols, rows } = body;

  // Create new session
  if (type === "create" || (!sessionId && !type)) {
    const newSessionId = randomUUID();
    const cwd = process.env.WORKSPACE_ROOT || "/app";
    const proc = spawn("/bin/sh", ["-i"], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color", SHELL: "/bin/sh", LANG: "en_US.UTF-8" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    sessions.set(newSessionId, { proc, paused: false });
    return NextResponse.json({ sessionId: newSessionId });
  }

  // Send input to existing session
  if (type === "input" && sessionId && sessions.has(sessionId)) {
    sessions.get(sessionId)!.proc.stdin.write(data);
    return NextResponse.json({ ok: true });
  }

  // Resize (send SIGWINCH)
  if (type === "resize" && sessionId && sessions.has(sessionId)) {
    const { proc } = sessions.get(sessionId)!;
    proc.emit("resize", cols || 80, rows || 24);
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
