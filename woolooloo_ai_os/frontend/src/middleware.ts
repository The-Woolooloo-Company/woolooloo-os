import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/api/config/status'];
const RATE_LIMITED_ROUTES = ['/api/woolworks/inference', '/api/clockify'];

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 30; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  // Clean old entries
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(key, recent);
    return true;
  }
  
  recent.push(now);
  rateLimitMap.set(key, recent);
  return false;
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Rate limiting for sensitive endpoints
  for (const route of RATE_LIMITED_ROUTES) {
    if (pathname.startsWith(route)) {
      const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
      const rateKey = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
      
      if (isRateLimited(rateKey)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again later.' },
          { status: 429 }
        );
      }
      break;
    }
  }
  
  // Auth check: session cookie (enhanced security for production)
  // Note: Still allow localStorage auth for backward compatibility
  // In production, enforce HTTP-only cookies exclusively
  const sessionCookie = request.cookies.get('woolooloo-session');
  
  // If session cookie exists, validate it (future: server-side validation)
  if (sessionCookie) {
    const response = NextResponse.next();
    // Refresh cookie
    response.cookies.set('woolooloo-session', sessionCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp)$).*)',
  ],
};
