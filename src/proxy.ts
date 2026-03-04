import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/features/auth/server';
import { CSRF_COOKIE_NAME, ensureCsrfCookie } from '@/shared/lib/security/csrf';

const LEGACY_PRODUCTS_PREFIX = '/api/products';
const LEGACY_PRODUCTS_DEPRECATED_ON = '2026-03-04';

const baseProxy = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  ensureCsrfCookie(response, existing);
  return response;
};

const isLegacyProductsPath = (pathname: string): boolean =>
  pathname === LEGACY_PRODUCTS_PREFIX || pathname.startsWith(`${LEGACY_PRODUCTS_PREFIX}/`);

const toV2ProductsPath = (pathname: string): string =>
  pathname === LEGACY_PRODUCTS_PREFIX
    ? '/api/v2/products'
    : `/api/v2/products${pathname.slice(LEGACY_PRODUCTS_PREFIX.length)}`;

const deprecatedLegacyProductsResponse = (request: NextRequest): NextResponse => {
  const { pathname, search } = request.nextUrl;
  const successorPath = `${toV2ProductsPath(pathname)}${search}`;

  return NextResponse.json(
    {
      error: 'Deprecated API route',
      message:
        'Legacy products API routes were retired on 2026-03-04. Use /api/v2/products endpoints.',
      deprecatedPath: `${pathname}${search}`,
      successorPath,
      deprecatedOn: LEGACY_PRODUCTS_DEPRECATED_ON,
    },
    {
      status: 410,
      headers: {
        Sunset: LEGACY_PRODUCTS_DEPRECATED_ON,
        Link: `<${successorPath}>; rel="successor-version"`,
      },
    }
  );
};

type NextRequestHandler = (
  request: NextRequest,
  context: Record<string, unknown>
) => Promise<Response> | Response;

const handler: NextRequestHandler | null =
  typeof auth === 'function' ? (auth as unknown as NextRequestHandler) : null;

type HandlerContext = Parameters<NextRequestHandler>[1];

const shouldBypassAuth = (request: NextRequest): boolean =>
  request.nextUrl.pathname.startsWith('/api/');

export function proxy(
  request: NextRequest,
  context?: HandlerContext
): Promise<Response> | Response {
  if (isLegacyProductsPath(request.nextUrl.pathname)) {
    return deprecatedLegacyProductsResponse(request);
  }

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
