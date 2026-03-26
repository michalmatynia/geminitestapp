import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureCsrfCookieMock } = vi.hoisted(() => ({
  ensureCsrfCookieMock: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();

  class MockNextResponse extends Response {
    cookies = {
      set: (
        name: string,
        value: string,
        options?: {
          path?: string;
          sameSite?: 'lax' | 'strict' | 'none';
        }
      ) => {
        const segments = [`${name}=${value}`];
        if (options?.path) {
          segments.push(`Path=${options.path}`);
        }
        if (options?.sameSite) {
          segments.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
        }
        this.headers.append('set-cookie', segments.join('; '));
      },
    };

    static next(init?: ResponseInit & { request?: { headers?: Headers } }) {
      return new MockNextResponse(null, {
        status: 200,
        headers: {
          'x-middleware-next': '1',
          ...(init?.headers ?? {}),
        },
      });
    }

    static rewrite(url: string | URL, init?: ResponseInit & { request?: { headers?: Headers } }) {
      return new MockNextResponse(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': String(url),
          ...(init?.headers ?? {}),
        },
      });
    }

    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });
    }

    static redirect(url: string | URL, init?: number | ResponseInit) {
      const status = typeof init === 'number' ? init : init?.status ?? 307;
      const headers =
        typeof init === 'number'
          ? { Location: String(url) }
          : { Location: String(url), ...(init?.headers ?? {}) };
      return new MockNextResponse(null, {
        status,
        headers,
      });
    }
  }

  return {
    ...actual,
    NextResponse: MockNextResponse,
  };
});

vi.mock('@/features/auth/edge', () => ({
  auth: undefined,
}));

vi.mock('@/shared/lib/security/csrf', () => ({
  CSRF_COOKIE_NAME: 'csrf-token',
  ensureCsrfCookie: (...args: unknown[]) => ensureCsrfCookieMock(...args),
}));

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');
  const {
    buildLocalizedPathname,
    getDefaultSiteLocaleCode,
    getPathLocale,
    resolvePreferredSiteLocale,
  } = await import('@/shared/lib/i18n/site-locale');

  return {
    default:
      (routing: {
        defaultLocale: string;
        localeCookie?: false | { name: string; sameSite?: 'lax' | 'strict' | 'none' };
        localePrefix?: 'always' | 'as-needed' | 'never' | { mode: 'always' | 'as-needed' | 'never' };
      }) =>
      (request: {
        url: string;
        nextUrl: { pathname: string; search: string };
        headers: Headers;
        cookies: {
          get: (name: string) => { value: string } | undefined;
          has: (name: string) => boolean;
        };
      }) => {
        const pathname = request.nextUrl.pathname;
        const pathLocale = getPathLocale(pathname);
        const locale = pathLocale
          ? pathLocale
          : resolvePreferredSiteLocale({
              pathname,
              cookieLocale: request.cookies.get(routing.localeCookie?.name ?? 'NEXT_LOCALE')?.value,
              acceptLanguage: request.headers.get('accept-language'),
            });

        const defaultLocale = routing.defaultLocale ?? getDefaultSiteLocaleCode();
        const targetPathname = buildLocalizedPathname(pathname, locale);

        let response: Response;
        if (pathLocale) {
          response =
            targetPathname === pathname
              ? NextResponse.next()
              : NextResponse.redirect(new URL(targetPathname, request.url));
        } else if (targetPathname !== pathname) {
          response = NextResponse.redirect(new URL(targetPathname, request.url));
        } else {
          const internalPathname =
            locale === defaultLocale ? `/${defaultLocale}${pathname === '/' ? '' : pathname}` : pathname;
          response = NextResponse.rewrite(new URL(internalPathname, request.url));
        }

        if (routing.localeCookie !== false) {
          const cookieName = routing.localeCookie?.name ?? 'NEXT_LOCALE';
          const existingLocale = request.cookies.get(cookieName)?.value ?? null;
          const acceptLanguageLocale = resolvePreferredSiteLocale({
            acceptLanguage: request.headers.get('accept-language'),
          });

          if (existingLocale && existingLocale !== locale) {
            (response as Response & {
              cookies: { set: (name: string, value: string, options?: { sameSite?: string }) => void };
            }).cookies.set(cookieName, locale, {
              sameSite: routing.localeCookie?.sameSite ?? 'lax',
            });
          } else if (!existingLocale && acceptLanguageLocale !== locale) {
            (response as Response & {
              cookies: { set: (name: string, value: string, options?: { sameSite?: string }) => void };
            }).cookies.set(cookieName, locale, {
              sameSite: routing.localeCookie?.sameSite ?? 'lax',
            });
          }
        }

        return response;
      },
  };
});

import { proxy } from '@/proxy';

const createRequest = (
  url: string,
  options?: {
    csrfToken?: string;
    localeCookie?: string;
    acceptLanguage?: string;
    method?: string;
  }
): {
  url: string;
  method: string;
  nextUrl: { pathname: string; search: string };
  headers: { get: (name: string) => string | null };
  cookies: { get: (name: string) => { value: string } | undefined };
} => {
  const parsed = new URL(url);
  const headers = new Headers();
  if (options?.acceptLanguage) {
    headers.set('accept-language', options.acceptLanguage);
  }
  return {
    url: parsed.toString(),
    method: options?.method ?? 'GET',
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
      basePath: '',
      protocol: parsed.protocol,
    },
    headers,
    cookies: {
      get: (name: string) =>
        name === 'csrf-token' && options?.csrfToken
          ? { value: options.csrfToken }
          : name === 'NEXT_LOCALE' && options?.localeCookie
            ? { value: options.localeCookie }
            : undefined,
      has: (name: string) =>
        (name === 'csrf-token' && Boolean(options?.csrfToken)) ||
        (name === 'NEXT_LOCALE' && Boolean(options?.localeCookie)),
    },
  };
};

describe('proxy api routing', () => {
  beforeEach(() => {
    ensureCsrfCookieMock.mockReset();
  });

  it('lets legacy /api/products paths fall through base proxy flow', async () => {
    const request = createRequest(
      'http://localhost/api/products/categories/tree?catalogId=catalog-1&fresh=1'
    );

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('allows /api/v2/products paths through base proxy flow', async () => {
    const request = createRequest('http://localhost/api/v2/products?page=1');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('redirects public requests to a negotiated non-default locale path', async () => {
    const request = createRequest('http://localhost/products/123', {
      acceptLanguage: 'en-US,en;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/en/products/123');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('keeps default-locale public requests unprefixed', async () => {
    const request = createRequest('http://localhost/products/123', {
      acceptLanguage: 'pl-PL,pl;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('passes the default-locale root route through without rewriting it to a locale-prefixed alias', async () => {
    const request = createRequest('http://localhost/', {
      localeCookie: 'pl',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('canonicalizes superfluous default-locale prefixes', async () => {
    const request = createRequest('http://localhost/pl/about');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/about');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('passes localized public paths through and persists the explicit locale', async () => {
    const request = createRequest('http://localhost/en/about');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toContain('NEXT_LOCALE=en');
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });
});
