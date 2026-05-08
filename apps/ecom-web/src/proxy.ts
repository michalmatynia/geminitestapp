import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locales';

// Keep the standalone ecommerce workspace isolated from the root platform proxy.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, possibleLocale, ...rest] = pathname.split('/');
  const locale = isSupportedLocale(possibleLocale) ? possibleLocale : DEFAULT_LOCALE;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-ecom-locale', locale);
  requestHeaders.set('x-ecom-pathname', pathname);
  requestHeaders.set('x-ecom-search', request.nextUrl.search);

  if (!isSupportedLocale(possibleLocale)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = rest.length > 0 ? `/${rest.join('/')}` : '/';
  return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!api|_next|uploads|favicon.ico|robots.txt|sitemap.xml).*)'],
};
