import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/edge';
import { siteRouting } from '@/i18n/routing';
import { buildAdminLayoutSessionHeaderValue, ADMIN_LAYOUT_SESSION_HEADER } from '@/shared/lib/auth/admin-layout-session';
import {
  getDefaultSiteLocaleCode,
  getPathLocale,
  resolvePreferredSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { applyEdgeTrafficGuard } from '@/shared/lib/security/edge-traffic-guard';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

import type { Session } from 'next-auth';

const intlMiddleware = createIntlMiddleware(siteRouting);

const ADMIN_CANONICAL_REDIRECTS = new Map<string, string>([
  ['/admin/ai-paths/jobs', '/admin/ai-paths/queue'],
  ['/admin/databases', '/admin/databases/engine'],
  ['/admin/databases/backups', '/admin/databases/engine?view=backups'],
  ['/admin/databases/control', '/admin/databases/engine'],
  ['/admin/databases/operations', '/admin/databases/engine?view=operations'],
  ['/admin/databases/settings', '/admin/databases/engine'],
  ['/admin/image-studio/settings', '/admin/image-studio?tab=settings'],
  ['/admin/image-studio/validation-patterns', '/admin/image-studio?tab=validation'],
  ['/admin/integrations/aggregators', '/admin/integrations/aggregators/base-com'],
  [
    '/admin/integrations/aggregators/base-com',
    '/admin/integrations/aggregators/base-com/synchronization-engine',
  ],
  ['/admin/integrations/imports', '/admin/integrations/aggregators/base-com/import-export'],
  [
    '/admin/integrations/marketplaces/category-mapper',
    '/admin/integrations/aggregators/base-com/category-mapping',
  ],
  ['/admin/products/builder', '/admin/products/settings'],
  ['/admin/products/constructor', '/admin/products/settings'],
  ['/admin/products/jobs', '/admin/ai-paths/queue?tab=paths-external'],
  ['/admin/prompt-engine', '/admin/prompt-engine/validation'],
  ['/admin/settings/ai', '/admin/brain?tab=routing'],
  ['/admin/settings/brain', '/admin/brain?tab=routing'],
  ['/admin/settings/database', '/admin/databases/engine'],
  ['/admin/system/upload-events', '/admin/ai-paths/queue?tab=file-uploads'],
]);

const finalizeResponse = (request: NextRequest, response: NextResponse): NextResponse => {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const baseProxy = (request: NextRequest, requestHeaders?: Headers): NextResponse => {
  const response = requestHeaders ? NextResponse.next({ request: { headers: requestHeaders } }) : NextResponse.next();
  return finalizeResponse(request, response);
};

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];
type AuthenticatedProxyRequest = NextRequest & { auth?: Session | null };

const isApiRequest = (pathname: string): boolean => pathname === '/api' || pathname.startsWith('/api/');

const isAdminRequest = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/');

const isSafePageMethod = (request: NextRequest): boolean =>
  request.method === 'GET' || request.method === 'HEAD';

const isDefaultLocaleBypassPath = (pathname: string): boolean => {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/kangur' ||
    pathname.startsWith('/kangur/') ||
    pathname === '/products' ||
    pathname.startsWith('/products/') ||
    pathname === '/preview' ||
    pathname.startsWith('/preview/')
  );
};

const getLocaleCookieName = (): string | null =>
  siteRouting.localeCookie === false
    ? null
    : siteRouting.localeCookie === true
      ? 'NEXT_LOCALE'
      : (siteRouting.localeCookie?.name ?? 'NEXT_LOCALE');

const syncExplicitLocaleCookie = (
  request: NextRequest,
  response: NextResponse,
  locale: string
): NextResponse => {
  const localeCookieName = getLocaleCookieName();
  if (!localeCookieName) {
    return response;
  }

  const existingLocale = request.cookies.get(localeCookieName)?.value ?? null;
  if (existingLocale === locale) {
    return response;
  }

  response.cookies.set(localeCookieName, locale, {
    sameSite:
      siteRouting.localeCookie === false || siteRouting.localeCookie === true
        ? 'lax'
        : (siteRouting.localeCookie?.sameSite ?? 'lax'),
  });
  return response;
};

const shouldBypassIntlRewriteForDefaultLocale = (request: NextRequest): boolean => {
  const pathname = request.nextUrl.pathname;
  if (getPathLocale(pathname)) {
    return false;
  }

  const localeCookieName = getLocaleCookieName();
  const resolvedLocale = resolvePreferredSiteLocale({
    pathname,
    cookieLocale: localeCookieName ? request.cookies.get(localeCookieName)?.value ?? null : null,
    acceptLanguage: request.headers.get('accept-language'),
  });

  return resolvedLocale === getDefaultSiteLocaleCode() && isDefaultLocaleBypassPath(pathname);
};

const resolvePublicLocaleResponse = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) {
    return null;
  }

  const pathname = request.nextUrl.pathname;
  const pathLocale = getPathLocale(pathname);
  const defaultLocale = getDefaultSiteLocaleCode();

  if (pathLocale && pathLocale !== defaultLocale) {
    return syncExplicitLocaleCookie(request, baseProxy(request), pathLocale);
  }

  if (shouldBypassIntlRewriteForDefaultLocale(request)) {
    return baseProxy(request);
  }

  return finalizeResponse(request, intlMiddleware(request));
};

const resolveAdminRedirectResponse = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) {
    return null;
  }

  const destination = ADMIN_CANONICAL_REDIRECTS.get(request.nextUrl.pathname);
  if (!destination) {
    return null;
  }

  return finalizeResponse(request, NextResponse.redirect(new URL(destination, request.url), 307));
};

const buildAdminRequestHeaders = (request: AuthenticatedProxyRequest): Headers | null => {
  const sessionHeaderValue = buildAdminLayoutSessionHeaderValue(request.auth ?? null);
  if (!sessionHeaderValue) return null;

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(ADMIN_LAYOUT_SESSION_HEADER, sessionHeaderValue);
  return forwardedHeaders;
};

const handler =
  typeof auth === 'function'
    ? auth(
      (request: AuthenticatedProxyRequest): Response =>
        baseProxy(request, buildAdminRequestHeaders(request) ?? undefined)
    )
    : null;

export function proxy(
  request: NextRequest,
  context?: HandlerContext
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  const pathname = request.nextUrl.pathname;
  const trafficGuardResponse = applyEdgeTrafficGuard(request);

  if (trafficGuardResponse) {
    return trafficGuardResponse;
  }

  if (isApiRequest(pathname)) {
    return baseProxy(request);
  }

  if (!isAdminRequest(pathname)) {
    return resolvePublicLocaleResponse(request) ?? baseProxy(request);
  }

  const fastRedirect = resolveAdminRedirectResponse(request);
  if (fastRedirect) {
    return fastRedirect;
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
