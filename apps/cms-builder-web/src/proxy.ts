import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { authConfig } from '@/features/auth/auth.config';
import { auth } from '@/features/auth/edge';
import { siteRouting } from '@/i18n/routing';
import {
  ADMIN_LAYOUT_SESSION_HEADER,
  buildAdminLayoutSessionHeaderValue,
} from '@/shared/lib/auth/admin-layout-session';
import {
  getDefaultSiteLocaleCode,
  getPathLocale,
  resolvePreferredSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

import type { Session } from 'next-auth';

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];
type AuthenticatedProxyRequest = NextRequest & { auth?: Session | null };

const CMS_ALIAS_PREFIX = '/cms';
const CMS_ADMIN_PREFIX = '/admin/cms';
const intlMiddleware = createIntlMiddleware(siteRouting);

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

const isCmsAdminRequest = (pathname: string): boolean =>
  pathname === CMS_ADMIN_PREFIX || pathname.startsWith(`${CMS_ADMIN_PREFIX}/`);

const isCmsAliasRequest = (pathname: string): boolean =>
  pathname === CMS_ALIAS_PREFIX || pathname.startsWith(`${CMS_ALIAS_PREFIX}/`);

const isSafePageMethod = (request: NextRequest): boolean =>
  request.method === 'GET' || request.method === 'HEAD';

const isDefaultLocaleBypassPath = (pathname: string): boolean =>
  pathname === '/' ||
  pathname === '/auth' ||
  pathname.startsWith('/auth/') ||
  pathname === '/login';

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
  if (!localeCookieName) return response;

  const existingLocale = request.cookies.get(localeCookieName)?.value ?? null;
  if (existingLocale === locale) return response;

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
  if (getPathLocale(pathname)) return false;

  const localeCookieName = getLocaleCookieName();
  const resolvedLocale = resolvePreferredSiteLocale({
    pathname,
    cookieLocale: localeCookieName ? request.cookies.get(localeCookieName)?.value ?? null : null,
    acceptLanguage: request.headers.get('accept-language'),
  });

  return resolvedLocale === getDefaultSiteLocaleCode() && isDefaultLocaleBypassPath(pathname);
};

const resolvePublicLocaleResponse = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) return null;

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

const resolveCmsAliasRedirect = (request: NextRequest): NextResponse | null => {
  if (!isCmsAliasRequest(request.nextUrl.pathname)) return null;

  const target = request.nextUrl.clone();
  target.pathname = `${CMS_ADMIN_PREFIX}${request.nextUrl.pathname.slice(CMS_ALIAS_PREFIX.length)}`;
  return finalizeResponse(request, NextResponse.redirect(target, 307));
};

const buildAdminRequestHeaders = (request: AuthenticatedProxyRequest): Headers | null => {
  const sessionHeaderValue = buildAdminLayoutSessionHeaderValue(request.auth ?? null);
  if (!sessionHeaderValue) return null;

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(ADMIN_LAYOUT_SESSION_HEADER, sessionHeaderValue);
  return forwardedHeaders;
};

const buildSignInRedirect = (request: NextRequest): NextResponse => {
  const target = new URL('/auth/signin', request.url);
  target.searchParams.set(
    'callbackUrl',
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return finalizeResponse(request, NextResponse.redirect(target, 307));
};

const toMutableResponse = (response: Response): NextResponse =>
  new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

const authorizeCmsAdminRequest = async (
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

const handler =
  typeof auth === 'function'
    ? auth(async (request: AuthenticatedProxyRequest): Promise<Response> => {
        const authResponse = await authorizeCmsAdminRequest(request);
        if (authResponse) return authResponse;

        return baseProxy(request, buildAdminRequestHeaders(request) ?? undefined);
      })
    : null;

export function proxy(request: NextRequest, context?: HandlerContext): Promise<Response> | Response {
  const aliasRedirect = resolveCmsAliasRedirect(request);
  if (aliasRedirect) return aliasRedirect;

  if (!isCmsAdminRequest(request.nextUrl.pathname)) {
    return resolvePublicLocaleResponse(request) ?? baseProxy(request);
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
