// src/middleware.ts
// Note: Auth is handled client-side via AuthProvider in layout.tsx
// Middleware is a no-op placeholder for future use

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
