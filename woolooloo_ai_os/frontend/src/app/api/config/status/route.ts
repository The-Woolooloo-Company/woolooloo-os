// GET /api/config/status - Return integration status flags (no actual keys exposed)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    linear: !!(process.env.LINEAR_API_KEY && process.env.LINEAR_API_KEY.length > 10),
    clockify: !!(process.env.CLOCKIFY_API_KEY && process.env.CLOCKIFY_API_KEY.length > 10),
    github: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 10),
    vllm: !!process.env.VLLM_HOST,
    openrouter: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith('sk-or-')),
    notion: !!process.env.NOTION_API_KEY,
    slack: !!process.env.SLACK_BOT_TOKEN,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    xero: !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET),
  });
}
