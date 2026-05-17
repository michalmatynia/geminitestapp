import { type NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'de', 'pl'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function extractLocale(pathname: string): SupportedLocale | null {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const locale = extractLocale(pathname);

  if (locale !== null) {
    // Pass through - stamp x-pathname so root layout can read the locale.
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  }

  // Redirect unlocalized paths to /en.
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/*       (static assets, image optimisation, dev HMR)
     * - favicon.ico
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
