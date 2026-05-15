// Git operations for workspace
// GET /api/workspace/git - Get status, diff, log
// POST /api/workspace/git - Commit, push, pull, add, stash

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/app';

function runGit(cmd: string): string {
  try {
    return execSync(cmd, { cwd: WORKSPACE_ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 }).trim();
  } catch (err: any) {
    return err.stderr?.trim() || err.stdout?.trim() || String(err.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const op = url.searchParams.get('op') || 'status';

    if (op === 'status') {
      const status = runGit('git status --porcelain');
      const branch = runGit('git branch --show-current');
      const ahead = runGit('git rev-list --count HEAD...origin/HEAD 2>/dev/null') || '?';
      return NextResponse.json({ status, branch, ahead: parseInt(ahead) || 0 });
    }

    if (op === 'diff') {
      const files = url.searchParams.get('files');
      const diff = runGit(`git diff --stat${files ? ' ' + files : ''}`);
      const detail = runGit(`git diff${files ? ' ' + files : ''}`);
      return NextResponse.json({ diff, detail });
    }

    if (op === 'log') {
      const count = url.searchParams.get('count') || '10';
      const log = runGit(`git log -${count} --pretty=format:"%h|%an|%ad|%s" --date=short`);
      const commits = log.split('\n').filter(Boolean).map(line => {
        const [sha, author, date, ...rest] = line.split('|');
        return { sha, author, date, message: rest.join('|') };
      });
      return NextResponse.json({ commits });
    }

    if (op === 'branches') {
      const branches = runGit('git branch -v --no-color');
      return NextResponse.json({ branches });
    }

    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'add': {
        const files = body.files || '.';
        runGit(`git add ${files}`);
        return NextResponse.json({ success: true });
      }

      case 'commit': {
        const message = body.message || `workspace: ${new Date().toISOString()}`;
        const files = body.files;
        if (files) runGit(`git add ${files}`);
        else runGit('git add .');
        const result = runGit(`git commit -m "${message}"`);
        const commitHash = runGit('git log -1 --format=%h');
        return NextResponse.json({ success: true, commit: commitHash, message: result });
      }

      case 'push': {
        const branch = body.branch || 'HEAD';
        const result = runGit(`git push origin ${branch}`);
        return NextResponse.json({ success: true, message: result });
      }

      case 'pull': {
        const result = runGit('git pull origin HEAD');
        return NextResponse.json({ success: true, message: result });
      }

      case 'stash': {
        const message = body.message || `workspace: ${new Date().toISOString()}`;
        runGit(`git stash push -m "${message}"`);
        return NextResponse.json({ success: true });
      }

      case 'stash-pop': {
        const result = runGit('git stash pop');
        return NextResponse.json({ success: true, message: result });
      }

      case 'reset': {
        const files = body.files || '.';
        runGit(`git checkout -- ${files}`);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
