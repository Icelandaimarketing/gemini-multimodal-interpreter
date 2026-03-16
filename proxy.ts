import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextProxy, ProxyConfig } from 'next/server';

export const proxy: NextProxy = function (request: NextRequest) {
  const response = NextResponse.next();

  // Add security and proxy headers
  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Force HTTPS if the proxy didn't
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http') {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    return NextResponse.redirect(url);
  }

  // Disable caching for main routes to avoid stale chunk issues
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/bridge/' || !request.nextUrl.pathname.includes('.')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  return response;
};

export const config: ProxyConfig = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
