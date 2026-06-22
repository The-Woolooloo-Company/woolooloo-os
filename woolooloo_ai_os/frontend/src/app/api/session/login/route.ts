// POST /api/session/login - Server-side login with HTTP-only session cookie
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const USERS_KEY = 'woolooloo-users';
const SESSIONS_KEY = 'woolooloo-sessions';

function getUsers(): Array<{ username: string; password: string; isAdmin: boolean }> {
  try {
    // In production, load from database or secure store
    // For now, read from localStorage-compatible format stored server-side
    if (typeof process.env[USERS_KEY] === 'string') {
      return JSON.parse(process.env[USERS_KEY]);
    }
  } catch {}
  return [];
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username: string; password: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Validate credentials
    const users = getUsers();
    const user = users.find(u => u.username === username.trim().toLowerCase());
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create session
    const sessionId = generateSessionId();
    const sessionData = {
      id: sessionId,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: new Date().toISOString(),
    };

    // Store session (in production: Redis/database)
    // For now: just validate on creation, use cookie for auth
    const response = NextResponse.json({
      success: true,
      user: { username: sessionData.username, isAdmin: sessionData.isAdmin },
    });

    // Set HTTP-only session cookie
    response.cookies.set('woolooloo-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
