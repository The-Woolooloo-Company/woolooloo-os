// Terminal command execution with streaming output
// POST /api/workspace/command
// Body: { command: string, cwd?: string }

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const command = body.command?.trim();
    const cwd = body.cwd || WORKSPACE_ROOT;

    if (!command) {
      return NextResponse.json({ error: 'No command provided' }, { status: 400 });
    }

    // Block dangerous commands
    const blockedPatterns = [
      'rm -rf /', 'mkfs', 'dd if=', ':{(){:|:;}', 'curl.*|.*bash', 'wget.*|.*sh',
      'format', 'fdisk', 'parted', 'dd of=', 'chmod -R 777 /',
    ];
    if (blockedPatterns.some(p => command.toLowerCase().includes(p.toLowerCase()))) {
      return NextResponse.json({ error: 'Command blocked for safety' }, { status: 403 });
    }

    // Execute command with streaming output
    const enc = new TextEncoder();
    const child = spawn('sh', ['-c', command], {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const stream = new ReadableStream({
      start(controller) {
        child.stdout?.on('data', (data: Buffer) => {
          controller.enqueue(enc.encode(`out:${data.toString()}`));
        });
        child.stderr?.on('data', (data: Buffer) => {
          controller.enqueue(enc.encode(`err:${data.toString()}`));
        });
        child.on('close', (code) => {
          controller.enqueue(enc.encode(`exit:${code ?? 1}`));
          controller.close();
        });
        child.on('error', (err) => {
          controller.enqueue(enc.encode(`err:${err.message}`));
          controller.close();
        });
      },
      cancel() {
        child.kill('SIGTERM');
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
