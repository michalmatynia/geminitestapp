import { NextResponse, type NextRequest } from 'next/server';

import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const KANGUR_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Surrogate-Control': 'no-store',
  'x-middleware-cache': 'no-cache',
} as const;

const isKangurPageRequest = (pathname: string): boolean => {
  const strippedPathname = stripSiteLocalePrefix(pathname);
  return strippedPathname === '/kangur' || strippedPathname.startsWith('/kangur/');
};

const applyKangurNoStoreHeaders = (response: NextResponse): NextResponse => {
  Object.entries(KANGUR_NO_STORE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

export default function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  return isKangurPageRequest(request.nextUrl.pathname)
    ? applyKangurNoStoreHeaders(response)
    : response;
}

export const config = {
  matcher: ['/((?!api|kangur-api|_next|_vercel|.*\\..*).*)'],
};
