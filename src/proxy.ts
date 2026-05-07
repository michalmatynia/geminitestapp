/**
 * Next.js Middleware (Proxy)
 * 
 * Central request routing and processing layer that runs on Edge runtime.
 * Handles:
 * - Internationalization (i18n) routing with next-intl
 * - Authentication checks for admin routes
 * - CSRF protection via cookie management
 * - Traffic guard for security filtering
 * - Canonical URL redirects for admin routes
 * - Locale detection and cookie synchronization
 * - StudiQ/Kangur routing to separate origin
 * - CMS routing to separate origin
 * - Database Engine routing to separate origin
 * 
 * This middleware runs before every request and determines:
 * 1. Whether to allow the request
 * 2. Which locale to use
 * 3. Whether authentication is required
 * 4. Whether to redirect to a canonical URL
 */

import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/edge';
import { siteRouting } from '@/i18n/routing';
import { buildAdminLayoutSessionHeaderValue, ADMIN_LAYOUT_SESSION_HEADER } from '@/shared/lib/auth/admin-layout-session';
import {
  getDefaultSiteLocaleCode,
  getPathLocale,
  resolvePreferredSiteLocale,
  stripSiteLocalePrefix,
} from '@/shared/lib/i18n/site-locale';
import { applyEdgeTrafficGuard } from '@/shared/lib/security/edge-traffic-guard';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

import type { Session } from 'next-auth';

// Initialize next-intl middleware for i18n routing
const intlMiddleware = createIntlMiddleware(siteRouting);

/**
 * Admin route canonical redirects
 * Maps old/deprecated admin URLs to their current canonical locations
 * Ensures consistent URL structure across the admin interface
 */
const ADMIN_CANONICAL_REDIRECTS = new Map<string, string>([
  ['/admin/ai-paths/jobs', '/admin/ai-paths/queue'],
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
  ['/admin/products/jobs', '/admin/ai-paths/queue?tab=paths-external'],
  ['/admin/products/constructor', '/admin/products/settings'],
  ['/admin/prompt-engine', '/admin/prompt-engine/validation'],
  ['/admin/settings/ai', '/admin/brain?tab=routing'],
  ['/admin/settings/brain', '/admin/brain?tab=routing'],
  ['/admin/system/upload-events', '/admin/ai-paths/queue?tab=file-uploads'],
]);

/**
 * Finalize response with CSRF protection
 * Ensures every response has a valid CSRF token cookie
 */
const finalizeResponse = (request: NextRequest, response: NextResponse): NextResponse => {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

/**
 * Base proxy handler - passes request through with optional custom headers
 */
const baseProxy = (request: NextRequest, requestHeaders?: Headers): NextResponse => {
  const response = requestHeaders ? NextResponse.next({ request: { headers: requestHeaders } }) : NextResponse.next();
  return finalizeResponse(request, response);
};

type NextRequestHandler = NonNullable<typeof handler>;
type HandlerContext = Parameters<NextRequestHandler>[1];
type AuthenticatedProxyRequest = NextRequest & { auth?: Session | null };

// Separate app origins for focused deployments.
const getStudiqWebOrigin = (): string => process.env['STUDIQ_WEB_ORIGIN'] || '';
const getCmsWebOrigin = (): string =>
  process.env['CMS_WEB_ORIGIN'] || process.env['CMS_BUILDER_WEB_ORIGIN'] || '';
const getDatabaseEngineWebOrigin = (): string => process.env['DATABASE_ENGINE_WEB_ORIGIN'] || '';

const parseCsvEnv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

const normalizeHost = (value: string): string => {
  const raw = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (raw === '') return '';
  try {
    return new URL(raw.includes('://') ? raw : `http://${raw}`).hostname.toLowerCase();
  } catch {
    return raw.split(':')[0] ?? raw;
  }
};

const getCmsPublicHosts = (): string[] =>
  parseCsvEnv(process.env['CMS_PUBLIC_HOSTS']).map(normalizeHost).filter(Boolean);

const getCmsPublicPathPrefixes = (): string[] =>
  parseCsvEnv(process.env['CMS_PUBLIC_PATH_PREFIXES']).map((prefix) => {
    const withLeadingSlash = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
  });

/**
 * Check if request is for Kangur/StudiQ pages
 */
const isKangurPageRequest = (pathname: string): boolean => {
  const stripped = stripSiteLocalePrefix(pathname);
  return stripped === '/kangur' || stripped.startsWith('/kangur/');
};

/**
 * Check if request is for CMS Builder pages that can move to the standalone app.
 */
const isCmsBuilderPageRequest = (pathname: string): boolean => {
  const stripped = stripSiteLocalePrefix(pathname);
  return (
    stripped === '/admin/cms' ||
    stripped.startsWith('/admin/cms/') ||
    stripped === '/cms' ||
    stripped.startsWith('/cms/')
  );
};

const isDatabaseEnginePageRequest = (pathname: string): boolean => {
  const stripped = stripSiteLocalePrefix(pathname);
  return stripped === '/admin/databases' || stripped.startsWith('/admin/databases/');
};

const isDatabaseEngineApiRequest = (pathname: string): boolean =>
  pathname === '/api/databases' || pathname.startsWith('/api/databases/');

const resolveDatabaseEnginePathname = (pathname: string): string => {
  const stripped = stripSiteLocalePrefix(pathname);
  return stripped;
};

const resolveCmsBuilderPathname = (pathname: string): string => {
  const stripped = stripSiteLocalePrefix(pathname);
  if (stripped === '/cms' || stripped.startsWith('/cms/')) {
    return `/admin/cms${stripped.slice('/cms'.length)}`;
  }
  return stripped;
};

const getRequestHost = (request: NextRequest): string =>
  normalizeHost(
    request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host
  );

const cmsPublicHostMatches = (host: string, configuredHost: string): boolean => {
  if (configuredHost.startsWith('*.')) {
    const suffix = configuredHost.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === configuredHost;
};

const isCmsPublicHostRequest = (request: NextRequest): boolean => {
  const hosts = getCmsPublicHosts();
  if (hosts.length === 0) return false;

  const host = getRequestHost(request);
  return host !== '' && hosts.some((configuredHost) => cmsPublicHostMatches(host, configuredHost));
};

const isCmsPublicPathRequest = (pathname: string): boolean => {
  const prefixes = getCmsPublicPathPrefixes();
  if (prefixes.length === 0) return false;

  const stripped = stripSiteLocalePrefix(pathname);
  return prefixes.some((prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`));
};

const isCmsPublicPageHandoffRequest = (request: NextRequest): boolean =>
  isSafePageMethod(request) &&
  !isAdminRequest(request.nextUrl.pathname) &&
  (isCmsPublicHostRequest(request) || isCmsPublicPathRequest(request.nextUrl.pathname));

/**
 * Check if request is for API routes
 */
const isApiRequest = (pathname: string): boolean =>
  pathname === '/api' ||
  pathname.startsWith('/api/') ||
  pathname === '/kangur-api' ||
  pathname.startsWith('/kangur-api/');

/**
 * Check if request is for admin routes
 */
const isAdminRequest = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/');

/**
 * Check if request is for Playwright test fixtures
 */
const isPlaywrightFixturePath = (pathname: string): boolean =>
  pathname === '/__playwright' || pathname.startsWith('/__playwright/');

/**
 * Check if HTTP method is safe (GET/HEAD)
 */
const isSafePageMethod = (request: NextRequest): boolean =>
  request.method === 'GET' || request.method === 'HEAD';

/**
 * Paths that can bypass locale prefix for default locale
 * These paths work without /en/ prefix when English is default
 */
const isDefaultLocaleBypassPath = (pathname: string): boolean => {
  return (
    pathname === '/' ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/login' ||
    pathname === '/kangur' ||
    pathname.startsWith('/kangur/') ||
    pathname === '/products' ||
    pathname.startsWith('/products/') ||
    pathname === '/preview' ||
    pathname.startsWith('/preview/')
  );
};

/**
 * Get locale cookie name from routing config
 */
const getLocaleCookieName = (): string | null =>
  siteRouting.localeCookie === false
    ? null
    : siteRouting.localeCookie === true
      ? 'NEXT_LOCALE'
      : (siteRouting.localeCookie?.name ?? 'NEXT_LOCALE');

/**
 * Synchronize locale cookie with detected locale
 * Ensures cookie matches the locale being used
 */
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

/**
 * Determine if default locale prefix can be omitted
 * Allows cleaner URLs for default language
 */
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

/**
 * Resolve locale-aware response for public routes
 * Handles i18n routing and locale detection
 */
const resolvePublicLocaleResponse = (request: NextRequest): NextResponse | null => {
  if (!isSafePageMethod(request)) {
    return null;
  }

  const pathname = request.nextUrl.pathname;
  const pathLocale = getPathLocale(pathname);
  const strippedPathname = stripSiteLocalePrefix(pathname);
  
  // Playwright fixtures bypass locale handling
  if (isPlaywrightFixturePath(strippedPathname)) {
    return pathLocale
      ? syncExplicitLocaleCookie(request, baseProxy(request), pathLocale)
      : baseProxy(request);
  }

  const defaultLocale = getDefaultSiteLocaleCode();

  // Non-default locale: sync cookie and pass through
  if (pathLocale && pathLocale !== defaultLocale) {
    return syncExplicitLocaleCookie(request, baseProxy(request), pathLocale);
  }

  // Default locale bypass: skip i18n middleware for cleaner URLs
  if (shouldBypassIntlRewriteForDefaultLocale(request)) {
    return baseProxy(request);
  }

  // Standard i18n routing
  return finalizeResponse(request, intlMiddleware(request));
};

/**
 * Resolve admin canonical redirects
 * Redirects deprecated admin URLs to current locations
 */
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

/**
 * Build request headers with admin session data
 * Injects session information for admin routes
 */
const buildAdminRequestHeaders = (request: AuthenticatedProxyRequest): Headers | null => {
  const sessionHeaderValue = buildAdminLayoutSessionHeaderValue(request.auth ?? null);
  if (!sessionHeaderValue) return null;

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(ADMIN_LAYOUT_SESSION_HEADER, sessionHeaderValue);
  return forwardedHeaders;
};

/**
 * Authenticated handler for admin routes
 * Wraps admin requests with NextAuth authentication
 */
const handler =
  typeof auth === 'function'
    ? auth(
      (request: AuthenticatedProxyRequest): Response => {
        const fastRedirect = resolveAdminRedirectResponse(request);
        if (fastRedirect) {
          return fastRedirect;
        }

        return baseProxy(request, buildAdminRequestHeaders(request) ?? undefined);
      }
    )
    : null;

/**
 * Main proxy/middleware function
 * Routes all requests through appropriate handlers:
 * 1. Traffic guard (security)
 * 2. Database Engine API handoff if configured
 * 3. API routes (pass through)
 * 4. Kangur routes (redirect to StudiQ origin if configured)
 * 5. Database Engine routes (redirect to Database Engine origin if configured)
 * 6. Public routes (i18n handling)
 * 7. Admin routes (authentication + canonical redirects)
 */
export function proxy(
  request: NextRequest,
  context?: HandlerContext
): Promise<Response> | Response {
  const resolvedContext = context ?? ({ params: {} } as HandlerContext);
  const pathname = request.nextUrl.pathname;
  
  // Security: Apply traffic guard first
  const trafficGuardResponse = applyEdgeTrafficGuard(request);
  if (trafficGuardResponse) {
    return trafficGuardResponse;
  }

  const databaseEngineWebOrigin = getDatabaseEngineWebOrigin();
  if (databaseEngineWebOrigin && isDatabaseEngineApiRequest(pathname)) {
    const target = new URL(pathname, databaseEngineWebOrigin);
    target.search = request.nextUrl.search;
    return NextResponse.rewrite(target);
  }

  // API routes: pass through without modification
  if (isApiRequest(pathname)) {
    return baseProxy(request);
  }

  // Kangur routes: redirect to separate origin if configured
  const studiqWebOrigin = getStudiqWebOrigin();
  if (studiqWebOrigin && isKangurPageRequest(pathname)) {
    const target = new URL(pathname, studiqWebOrigin);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target.toString(), 307);
  }

  // CMS routes: redirect to separate origin if configured
  const cmsWebOrigin = getCmsWebOrigin();
  if (cmsWebOrigin && isCmsBuilderPageRequest(pathname)) {
    const target = new URL(resolveCmsBuilderPathname(pathname), cmsWebOrigin);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target.toString(), 307);
  }

  if (cmsWebOrigin && isCmsPublicPageHandoffRequest(request)) {
    const target = new URL(pathname, cmsWebOrigin);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target.toString(), 307);
  }

  // Database Engine routes: redirect to separate origin if configured
  if (databaseEngineWebOrigin && isDatabaseEnginePageRequest(pathname)) {
    const target = new URL(resolveDatabaseEnginePathname(pathname), databaseEngineWebOrigin);
    if (!target.search) {
      target.search = request.nextUrl.search;
    }
    return NextResponse.redirect(target.toString(), 307);
  }

  // Public routes: handle i18n
  if (!isAdminRequest(pathname)) {
    return resolvePublicLocaleResponse(request) ?? baseProxy(request);
  }

  // Admin routes: authentication + redirects
  if (!handler || typeof handler !== 'function') {
    return resolveAdminRedirectResponse(request) ?? baseProxy(request);
  }
  
  const result = handler(request, resolvedContext);
  if (result instanceof Promise) {
    return result.then((response) => response ?? baseProxy(request));
  }
  return result ?? baseProxy(request);
}

export default proxy;

/**
 * Middleware matcher configuration
 * Excludes Next.js internal routes and static files
 */
export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
