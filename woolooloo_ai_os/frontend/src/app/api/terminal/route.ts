import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";

interface Session {
  proc: ChildProcess;
}

const sessions = new Map<string, Session>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId || !sessions.has(sessionId)) {
    return new NextResponse("No session", { status: 400 });
  }

  const { proc } = sessions.get(sessionId)!;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      proc.stdout!.on("data", (chunk: Buffer) => {
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      });
      proc.stderr!.on("data", (chunk: Buffer) => {
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      });
      proc.on("close", (code: number) => {
        controller.enqueue(encoder.encode(`data: [Exited with code ${code}]\n\n`));
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

  if (type === "create") {
    const id = randomUUID();
    const cwd = process.env.WORKSPACE_ROOT || "/app";
    const proc = spawn("/bin/sh", ["-c", "exec /bin/sh"], {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        SHELL: "/bin/sh",
        LANG: "en_US.UTF-8",
        PS1: "\\u@woolooloo:\\w\\$ ",
      },
    });
    sessions.set(id, { proc });
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
