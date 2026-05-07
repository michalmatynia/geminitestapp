import { NextResponse, type NextRequest } from 'next/server';

import { authConfig } from '@/features/auth/auth.config';
import { auth } from '@/features/auth/edge';
import {
  ADMIN_LAYOUT_SESSION_HEADER,
  buildAdminLayoutSessionHeaderValue,
} from '@/shared/lib/auth/admin-layout-session';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

import type { Session } from 'next-auth';

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];
type AuthenticatedProxyRequest = NextRequest & { auth?: Session | null };

const DATABASE_ADMIN_PREFIX = '/admin/databases';

const finalizeResponse = (request: NextRequest, response: NextResponse): NextResponse => {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const baseProxy = (request: NextRequest, requestHeaders?: Headers): NextResponse => {
  const response = requestHeaders
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : NextResponse.next();
  return finalizeResponse(request, response);
};

const isDatabaseAdminRequest = (pathname: string): boolean =>
  pathname === DATABASE_ADMIN_PREFIX ||
  pathname.startsWith(`${DATABASE_ADMIN_PREFIX}/`);

const isSafePageMethod = (request: NextRequest): boolean =>
  request.method === 'GET' || request.method === 'HEAD';

const buildAdminRequestHeaders = (request: AuthenticatedProxyRequest): Headers | null => {
  const sessionHeaderValue = buildAdminLayoutSessionHeaderValue(request.auth ?? null);
  if (!sessionHeaderValue) return null;

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(ADMIN_LAYOUT_SESSION_HEADER, sessionHeaderValue);
  return forwardedHeaders;
};

const buildSignInRedirect = (request: NextRequest): NextResponse => {
  const target = new URL('/auth/signin', request.url);
  target.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return finalizeResponse(request, NextResponse.redirect(target, 307));
};

const toMutableResponse = (response: Response): NextResponse =>
  new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

const authorizeDatabaseAdminRequest = async (
  request: AuthenticatedProxyRequest
): Promise<Response | null> => {
  const authorized = authConfig.callbacks?.authorized;
  if (authorized === undefined) {
    return request.auth?.user === undefined ? buildSignInRedirect(request) : null;
  }

  const result = await authorized({
    auth: request.auth ?? null,
    request: { nextUrl: request.nextUrl },
  });

  if (result === true) return null;
  if (result instanceof Response) return finalizeResponse(request, toMutableResponse(result));
  return buildSignInRedirect(request);
};

const resolveCanonicalRedirect = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) return null;

  const redirects = new Map<string, string>([
    ['/admin', '/admin/databases'],
  ]);
  const destination = redirects.get(request.nextUrl.pathname);
  if (!destination) return null;

  return finalizeResponse(request, NextResponse.redirect(new URL(destination, request.url), 307));
};

const handler =
  typeof auth === 'function'
    ? auth(async (request: AuthenticatedProxyRequest): Promise<Response> => {
        const fastRedirect = resolveCanonicalRedirect(request);
        if (fastRedirect) return fastRedirect;

        const authResponse = await authorizeDatabaseAdminRequest(request);
        if (authResponse) return authResponse;

        return baseProxy(request, buildAdminRequestHeaders(request) ?? undefined);
      })
    : null;

export function proxy(request: NextRequest, context?: HandlerContext): Promise<Response> | Response {
  const fastRedirect = resolveCanonicalRedirect(request);
  if (fastRedirect) return fastRedirect;

  if (!isDatabaseAdminRequest(request.nextUrl.pathname)) {
    return baseProxy(request);
  }

  if (!handler || typeof handler !== 'function') {
    return baseProxy(request);
  }

  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  const result = handler(request, resolvedContext);
  if (result instanceof Promise) {
    return result.then((response) => response ?? baseProxy(request));
  }
  return result ?? baseProxy(request);
}

export default proxy;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
