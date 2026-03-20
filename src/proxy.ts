import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/server';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

const baseProxy = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const handler =
  typeof auth === 'function'
    ? auth((request: NextRequest): Response => baseProxy(request))
    : null;

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];

const shouldBypassAuth = (request: NextRequest): boolean =>
  request.nextUrl.pathname.startsWith('/api/');

export function proxy(
  request: NextRequest,
  context?: HandlerContext
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  if (shouldBypassAuth(request)) {
    return baseProxy(request);
  }
  if (!handler || typeof handler !== 'function') {
    return baseProxy(request);
  }
  const result = handler(request, resolvedContext);
  if (result instanceof Promise) {
    return result.then((response) => response ?? baseProxy(request));
  }
  return result ?? baseProxy(request);
}

export default proxy;

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
