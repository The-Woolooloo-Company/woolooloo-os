// POST /api/auth/login - Authenticate and issue JWT session cookie
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Default admin credentials (hash stored in env)
const DEFAULT_ADMIN_HASH = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_HASH;

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

async function createSessionToken(username: string, isAdmin: boolean): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
  );

  return new SignJWT({ username, isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Check against default admin (hash from env)
    if (DEFAULT_ADMIN_HASH) {
      const isValid = await bcrypt.compare(password, DEFAULT_ADMIN_HASH);
      if (isValid && username.toLowerCase() === 'admin') {
        const token = await createSessionToken('admin', true);
        const response = NextResponse.json({ success: true, username: 'admin' });
        
        response.cookies.set('session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_MAX_AGE,
          path: '/',
        });

        return response;
      }
    }

    // TODO: Add user database lookup here

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
