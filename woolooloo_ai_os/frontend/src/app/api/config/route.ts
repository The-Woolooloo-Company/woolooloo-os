// POST /api/config - Save integration config (server-side only)
import { NextRequest, NextResponse } from 'next/server';

const ENV_PATH = process.env.ENV_FILE_PATH || '.env';

const ALLOWED_KEYS = new Set([
  'LINEAR_API_KEY', 'LINEAR_WEBHOOK_SECRET', 'LINEAR_TEAM_ID',
  'CLOCKIFY_API_KEY', 'CLOCKIFY_WORKSPACE_ID',
  'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO',
  'VLLM_HOST', 'VLLM_MODEL', 'VLLM_API_KEY',
  'OPENROUTER_API_KEY', 'OPENROUTER_BASE_URL',
  'NOTION_API_KEY', 'NOTION_FOUNDER_INBOX_ID',
  'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM',
  'XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_CLIENT_ID', 'XERO_TENANT_ID',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;
    
    // Filter to allowed keys only
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key) && typeof value === 'string') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid keys to update' }, { status: 400 });
    }

    // Write to .env file
    const fs = await import('fs/promises');
    const path = await import('path');
    const resolvedPath = path.resolve(process.cwd(), ENV_PATH);
    
    let content = '';
    try {
      content = await fs.readFile(resolvedPath, 'utf8');
    } catch {
      // File doesn't exist yet, create it
    }

    const lines = content.split('\n');
    const updatedKeys = new Set(Object.keys(updates));
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        result.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) {
        result.push(line);
        continue;
      }
      const key = trimmed.slice(0, eqIdx).trim();
      if (updates[key] !== undefined) {
        updatedKeys.delete(key);
        result.push(`${key}="${updates[key]}"`);
      } else {
        result.push(line);
      }
    }

    // Add new keys that weren't in the file
    for (const key of updatedKeys) {
      result.push(`${key}="${updates[key]}"`);
    }

    await fs.writeFile(resolvedPath, result.join('\n'));
    return NextResponse.json({ success: true, updated: Object.keys(updates) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
