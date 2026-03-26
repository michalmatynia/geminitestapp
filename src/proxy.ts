import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/edge';
import { siteRouting } from '@/i18n/routing';
import {
  getDefaultSiteLocaleCode,
  getPathLocale,
  resolvePreferredSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

const intlMiddleware = createIntlMiddleware(siteRouting);

const finalizeResponse = (request: NextRequest, response: NextResponse): NextResponse => {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const baseProxy = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  return finalizeResponse(request, response);
};

const handler =
  typeof auth === 'function' ? auth((request: NextRequest): Response => baseProxy(request)) : null;

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];

const isApiRequest = (pathname: string): boolean => pathname === '/api' || pathname.startsWith('/api/');

const isAdminRequest = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/');

const isSafePageMethod = (request: NextRequest): boolean =>
  request.method === 'GET' || request.method === 'HEAD';

const shouldBypassIntlRewriteForDefaultLocale = (request: NextRequest): boolean => {
  const pathname = request.nextUrl.pathname;
  if (getPathLocale(pathname)) {
    return false;
  }

  const localeCookieName =
    siteRouting.localeCookie === false ? null : siteRouting.localeCookie?.name ?? 'NEXT_LOCALE';
  const resolvedLocale = resolvePreferredSiteLocale({
    pathname,
    cookieLocale: localeCookieName ? request.cookies.get(localeCookieName)?.value ?? null : null,
    acceptLanguage: request.headers.get('accept-language'),
  });

  return resolvedLocale === getDefaultSiteLocaleCode();
};

const resolvePublicLocaleResponse = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) {
    return null;
  }

  if (shouldBypassIntlRewriteForDefaultLocale(request)) {
    return baseProxy(request);
  }

  return finalizeResponse(request, intlMiddleware(request));
};

export function proxy(
  request: NextRequest,
  context?: HandlerContext
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  const pathname = request.nextUrl.pathname;

  if (isApiRequest(pathname)) {
    return baseProxy(request);
  }

  if (!isAdminRequest(pathname)) {
    return resolvePublicLocaleResponse(request) ?? baseProxy(request);
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
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
