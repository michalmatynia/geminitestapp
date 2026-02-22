import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/server';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

const baseProxy = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

type NextRequestHandler = (
  request: NextRequest,
  context: Record<string, unknown>,
) => Promise<Response> | Response;

const handler: NextRequestHandler | null = typeof auth === 'function' ? (auth as unknown as NextRequestHandler) : null;

type HandlerContext = Parameters<NextRequestHandler>[1];

const shouldBypassAuth = (request: NextRequest): boolean =>
  request.nextUrl.pathname.startsWith('/api/');

export function proxy(
  request: NextRequest,
  context?: HandlerContext,
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  if (shouldBypassAuth(request)) {
    return baseProxy(request);
  }
  if (!handler || typeof handler !== 'function') {
    return baseProxy(request);
  }
  return handler(request, resolvedContext);
}

export default proxy;

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
