import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || crypto.getRandomValues(new Uint8Array(32)).toString()
);

export interface SessionData {
  username: string;
  isAdmin: boolean;
}

type JWTPayload = JoseJWTPayload & {
  username: string;
  isAdmin: boolean;
  jti: string;
};

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Create a signed JWT session token.
 */
export async function createSession(data: SessionData): Promise<string> {
  return new SignJWT(data as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_MS / 1000}s`)
    .setJti(crypto.randomUUID())
    .sign(SESSION_SECRET);
}

/**
 * Verify and decode a JWT session token.
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      username: payload.username as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch {
    return null;
  }
}

/**
 * Build session cookie options.
 */
export function getCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'strict' | 'none'; maxAge: number; path: string } {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    path: '/',
  };
}
