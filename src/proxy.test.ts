import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEdgeTrafficGuardState } from '@/shared/lib/security/edge-traffic-guard';

const { authInvokeMock, ensureCsrfCookieMock } = vi.hoisted(() => ({
  authInvokeMock: vi.fn(),
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
  auth:
    (handler: (request: unknown, context: unknown) => Response | Promise<Response>) =>
    (request: unknown, context: unknown) =>
      authInvokeMock(handler, request, context),
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
    userAgent?: string;
    cookie?: string;
    host?: string;
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
  if (options?.userAgent) {
    headers.set('user-agent', options.userAgent);
  }
  if (options?.cookie) {
    headers.set('cookie', options.cookie);
  }
  headers.set('host', options?.host ?? parsed.host);
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
    resetEdgeTrafficGuardState();
    authInvokeMock.mockReset();
    authInvokeMock.mockImplementation(
      (
        handler: (request: unknown, context: unknown) => Response | Promise<Response>,
        request: unknown,
        context: unknown
      ) => handler(request, context)
    );
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

  it('lets browser-facing Kangur API paths through without locale rewriting', async () => {
    const request = createRequest(
      'http://localhost/kangur-api/ai-tutor/page-content?locale=en',
      {
        acceptLanguage: 'en-US,en;q=0.9',
      }
    );

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('canonicalizes admin redirect-only routes inside the auth-protected proxy path', async () => {
    const request = createRequest('http://localhost/admin/settings/ai');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin/brain?tab=routing');
    expect(authInvokeMock).toHaveBeenCalledTimes(1);
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('canonicalizes legacy admin aliases inside the auth-protected proxy path', async () => {
    const request = createRequest('http://localhost/admin/products/constructor');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin/products/settings');
    expect(authInvokeMock).toHaveBeenCalledTimes(1);
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('preserves auth short-circuits ahead of canonical admin redirects', async () => {
    authInvokeMock.mockImplementation((_handler: unknown, request: { url: string }) => {
      return new Response(null, {
        status: 307,
        headers: {
          Location: new URL('/admin?denied=1', request.url).toString(),
        },
      });
    });

    const request = createRequest('http://localhost/admin/settings/ai');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin?denied=1');
    expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
  });

  it('redirects CMS Builder routes to the configured standalone origin', async () => {
    process.env['CMS_BUILDER_WEB_ORIGIN'] = 'https://cms-builder.example.com';
    try {
      const aliasRequest = createRequest('http://localhost/cms/pages?tab=published');
      const aliasResponse = await Promise.resolve(proxy(aliasRequest as never, { params: {} }));

      expect(aliasResponse.status).toBe(307);
      expect(aliasResponse.headers.get('location')).toBe(
        'https://cms-builder.example.com/admin/cms/pages?tab=published'
      );

      const adminRequest = createRequest('http://localhost/admin/cms/builder?pageId=page-1');
      const adminResponse = await Promise.resolve(proxy(adminRequest as never, { params: {} }));

      expect(adminResponse.status).toBe(307);
      expect(adminResponse.headers.get('location')).toBe(
        'https://cms-builder.example.com/admin/cms/builder?pageId=page-1'
      );

      const localizedRequest = createRequest('http://localhost/en/cms/pages');
      const localizedResponse = await Promise.resolve(
        proxy(localizedRequest as never, { params: {} })
      );

      expect(localizedResponse.status).toBe(307);
      expect(localizedResponse.headers.get('location')).toBe(
        'https://cms-builder.example.com/admin/cms/pages'
      );
      expect(authInvokeMock).not.toHaveBeenCalled();
      expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
    } finally {
      delete process.env['CMS_BUILDER_WEB_ORIGIN'];
    }
  });

  it('redirects configured public CMS hosts and path prefixes to the CMS app origin', async () => {
    process.env['CMS_WEB_ORIGIN'] = 'https://cms.example.com';
    process.env['CMS_PUBLIC_HOSTS'] = 'cms-public.local,*.cms-sites.test';
    process.env['CMS_PUBLIC_PATH_PREFIXES'] = '/cms-pages';
    try {
      const hostRequest = createRequest('http://root.local/about?preview=1', {
        host: 'cms-public.local',
      });
      const hostResponse = await Promise.resolve(proxy(hostRequest as never, { params: {} }));

      expect(hostResponse.status).toBe(307);
      expect(hostResponse.headers.get('location')).toBe(
        'https://cms.example.com/about?preview=1'
      );

      const wildcardHostRequest = createRequest('http://root.local/contact', {
        host: 'client.cms-sites.test',
      });
      const wildcardHostResponse = await Promise.resolve(
        proxy(wildcardHostRequest as never, { params: {} })
      );

      expect(wildcardHostResponse.status).toBe(307);
      expect(wildcardHostResponse.headers.get('location')).toBe(
        'https://cms.example.com/contact'
      );

      const pathRequest = createRequest('http://root.local/en/cms-pages/landing?draft=1');
      const pathResponse = await Promise.resolve(proxy(pathRequest as never, { params: {} }));

      expect(pathResponse.status).toBe(307);
      expect(pathResponse.headers.get('location')).toBe(
        'https://cms.example.com/en/cms-pages/landing?draft=1'
      );
      expect(authInvokeMock).not.toHaveBeenCalled();
      expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
    } finally {
      delete process.env['CMS_WEB_ORIGIN'];
      delete process.env['CMS_PUBLIC_HOSTS'];
      delete process.env['CMS_PUBLIC_PATH_PREFIXES'];
    }
  });

  it('redirects Database Engine admin routes to the configured standalone origin', async () => {
    process.env['DATABASE_ENGINE_WEB_ORIGIN'] = 'https://database-engine.example.com';
    try {
      const engineRequest = createRequest('http://localhost/admin/databases/engine?view=backups');
      const engineResponse = await Promise.resolve(proxy(engineRequest as never, { params: {} }));

      expect(engineResponse.status).toBe(307);
      expect(engineResponse.headers.get('location')).toBe(
        'https://database-engine.example.com/admin/databases/engine?view=backups'
      );

      const directPageRequest = createRequest('http://localhost/admin/databases/crud');
      const directPageResponse = await Promise.resolve(
        proxy(directPageRequest as never, { params: {} })
      );

      expect(directPageResponse.status).toBe(307);
      expect(directPageResponse.headers.get('location')).toBe(
        'https://database-engine.example.com/admin/databases/crud'
      );
      expect(authInvokeMock).not.toHaveBeenCalled();
      expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
    } finally {
      delete process.env['DATABASE_ENGINE_WEB_ORIGIN'];
    }
  });

  it('rewrites Database Engine API routes to the configured standalone origin', async () => {
    process.env['DATABASE_ENGINE_WEB_ORIGIN'] = 'https://database-engine.example.com';
    try {
      const schemaRequest = createRequest(
        'http://localhost/api/databases/schema?provider=all&includeCounts=true'
      );
      const schemaResponse = await Promise.resolve(proxy(schemaRequest as never, { params: {} }));

      expect(schemaResponse.status).toBe(200);
      expect(schemaResponse.headers.get('x-middleware-rewrite')).toBe(
        'https://database-engine.example.com/api/databases/schema?provider=all&includeCounts=true'
      );
      expect(schemaResponse.headers.get('location')).toBeNull();

      const browseRequest = createRequest('http://localhost/api/databases/browse', {
        method: 'POST',
      });
      const browseResponse = await Promise.resolve(proxy(browseRequest as never, { params: {} }));

      expect(browseResponse.status).toBe(200);
      expect(browseResponse.headers.get('x-middleware-rewrite')).toBe(
        'https://database-engine.example.com/api/databases/browse'
      );
      expect(browseResponse.headers.get('location')).toBeNull();
      expect(authInvokeMock).not.toHaveBeenCalled();
      expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
    } finally {
      delete process.env['DATABASE_ENGINE_WEB_ORIGIN'];
    }
  });

  it('skips canonical admin redirects for non-safe methods', async () => {
    const request = createRequest('http://localhost/admin/settings/ai', {
      method: 'POST',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
    expect(authInvokeMock).toHaveBeenCalledTimes(1);
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

  it('rewrites default-locale bare public slugs through the localized app route', async () => {
    const request = createRequest('http://localhost/lessons', {
      acceptLanguage: 'pl-PL,pl;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost/pl/lessons');
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

  it('keeps default-locale auth routes unprefixed', async () => {
    const request = createRequest('http://localhost/auth/signin', {
      acceptLanguage: 'pl-PL,pl;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('keeps playwright fixture routes unprefixed regardless of negotiated locale', async () => {
    const request = createRequest('http://localhost/__playwright/live-scripter-fixture', {
      acceptLanguage: 'en-US,en;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('keeps locale-prefixed playwright fixture routes intact instead of canonicalizing them away', async () => {
    const request = createRequest('http://localhost/pl/__playwright/live-scripter-fixture');

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

  it('passes localized public paths through without rewriting the locale cookie when it already matches', async () => {
    const request = createRequest('http://localhost/en/about', {
      localeCookie: 'en',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('rate-limits repeated anonymous scraper traffic on public pages before rendering work fan-outs', async () => {
    let response: Response | undefined;

    for (let attempt = 0; attempt < 9; attempt += 1) {
      const request = createRequest('http://localhost/', {
        userAgent: 'curl/8.7.1',
      });
      response = await Promise.resolve(proxy(request as never, { params: {} }));
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('x-traffic-guard')).toBe('public-page-burst');
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(8);
  });
});
