import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request) {
  // Bloque complètement l'accès à /register
  if (request.nextUrl.pathname.startsWith('/register')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/register/:path*'],
};