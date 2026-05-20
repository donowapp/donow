/**
 * Middleware for protecting routes
 * Redirects unauthenticated users to login
 */

import { NextRequest, NextResponse } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/my-donations', '/create-donation', '/profile'];

// Auth routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if user has auth token (simplified - in real app use sessions)
  const hasAuth = request.cookies.get('auth-token');

  // Redirect to login if trying to access protected route
  if (protectedRoutes.some(route => path.startsWith(route))) {
    if (!hasAuth) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect to dashboard if already logged in and trying to access auth routes
  if (authRoutes.some(route => path.startsWith(route))) {
    if (hasAuth) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/my-donations/:path*',
    '/create-donation/:path*',
    '/profile/:path*',
    '/login/:path*',
    '/signup/:path*',
  ],
};