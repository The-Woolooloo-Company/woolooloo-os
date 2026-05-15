// Workspace file system API
// GET /api/workspace/files?path=...&action=list|read
// POST /api/workspace/files - { action: "write", path: "...", content: "..." }

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/app';

async function safeReadDir(dirPath: string): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result = [];
  for (const e of entries) {
    const fullPath = path.join(dirPath, e.name);
    const entry: any = {
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      path: fullPath,
    };
    if (e.isFile()) {
      const stat = await fs.stat(fullPath);
      entry.size = stat.size;
      entry.modified = stat.mtime;
    }
    result.push(entry);
  }
  return result;
}

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '[Binary file or read error]';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileAction = searchParams.get('action') || 'list';
    let targetPath = searchParams.get('path') || WORKSPACE_ROOT;

    // Safety: ensure path is within workspace root
    const resolved = path.resolve(targetPath);
    if (!resolved.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json({ error: 'Access denied: path outside workspace' }, { status: 403 });
    }

    if (fileAction === 'list') {
      try {
        const entries = await safeReadDir(resolved);
        return NextResponse.json({ path: resolved, entries });
      } catch {
        return NextResponse.json({ error: 'Directory not found', path: resolved }, { status: 404 });
      }
    }

    if (fileAction === 'read') {
      try {
        const content = await safeReadFile(resolved);
        const basename = path.basename(resolved);
        return NextResponse.json({ path: resolved, name: basename, content });
      } catch {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileAction = body.action;

    if (fileAction === 'write') {
      const filePath = path.resolve(body.path || '');
      if (!filePath.startsWith(WORKSPACE_ROOT)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      await fs.writeFile(filePath, body.content || '', 'utf-8');
      return NextResponse.json({ success: true, path: filePath });
    }

    if (fileAction === 'mkdir') {
      const dirPath = path.resolve(body.path || '');
      if (!dirPath.startsWith(WORKSPACE_ROOT)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      await fs.mkdir(dirPath, { recursive: true });
      return NextResponse.json({ success: true, path: dirPath });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
