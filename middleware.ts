import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'al_ameen_session';

// Fast base64url decode for Edge runtime
function decodeSession(token: string): { userId: string; email: string; username: string; fullName: string; role: 'admin' | 'cashier'; expiresAt: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const payload = parts[0];
    const decodedStr = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const session = JSON.parse(decodedStr);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

// Pages restricted to Admin only (Cashiers cannot access)
const ADMIN_ONLY_PATHS = [
  '/employees',
  '/salary',
  '/cashiers',
  '/expenses',
  '/purchases',
  '/reports',
  '/settings',
  '/manufacturing',
  '/installations',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, internal paths, and auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? decodeSession(sessionToken) : null;

  // 2. Unauthenticated user handling
  if (!session) {
    // If accessing API routes other than auth, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // If already on /login, let them pass
    if (pathname === '/login') {
      return NextResponse.next();
    }

    // Redirect any protected page to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. User is logged in, but visits /login -> redirect to their role home
  if (pathname === '/login') {
    const dest = session.role === 'admin' ? '/' : '/cashier';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // 4. Role-based route guard for Cashier
  if (session.role === 'cashier') {
    // Cashier trying to access root admin dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/cashier', request.url));
    }

    // Cashier trying to access Admin-only pages
    const isRestricted = ADMIN_ONLY_PATHS.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
    if (isRestricted) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/cashier', request.url));
    }
  }

  // Allow request to proceed
  const response = NextResponse.next();
  // Pass user headers down to route handlers if needed
  response.headers.set('x-user-id', session.userId);
  response.headers.set('x-user-role', session.role);
  response.headers.set('x-user-name', session.fullName);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
