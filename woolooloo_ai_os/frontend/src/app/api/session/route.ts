// GET /api/session - Check current session status
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('woolooloo-session')?.value;
  
  if (!sessionId) {
    return NextResponse.json({ authenticated: false });
  }

  // In production: validate session against Redis/database
  // For now: any non-empty session ID is valid (backward compat with localStorage)
  return NextResponse.json({
    authenticated: true,
    // Session data would be retrieved from store in production
  });
}
