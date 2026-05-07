import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authInvokeMock,
  authorizedMock,
  buildAdminLayoutSessionHeaderValueMock,
  ensureCsrfCookieMock,
} = vi.hoisted(() => ({
  authInvokeMock: vi.fn(),
  authorizedMock: vi.fn(),
  buildAdminLayoutSessionHeaderValueMock: vi.fn(),
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
      const headers = new Headers(init?.headers);
      headers.set('x-middleware-next', '1');

      const forwardedSession = init?.request?.headers?.get('x-admin-layout-session');
      if (forwardedSession) {
        headers.set('x-forwarded-admin-layout-session', forwardedSession);
      }

      return new MockNextResponse(null, {
        status: 200,
        headers,
      });
    }

    static rewrite(url: string | URL, init?: ResponseInit & { request?: { headers?: Headers } }) {
      const headers = new Headers(init?.headers);
      headers.set('x-middleware-rewrite', String(url));

      return new MockNextResponse(null, {
        status: 200,
        headers,
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

vi.mock('@/features/auth/auth.config', () => ({
  authConfig: {
    callbacks: {
      authorized: (...args: unknown[]) => authorizedMock(...args),
    },
  },
}));

vi.mock('@/features/auth/edge', () => ({
  auth:
    (handler: (request: unknown, context: unknown) => Response | Promise<Response>) =>
    (request: unknown, context: unknown) =>
      authInvokeMock(handler, request, context),
}));

vi.mock('@/shared/lib/auth/admin-layout-session', () => ({
  ADMIN_LAYOUT_SESSION_HEADER: 'x-admin-layout-session',
  buildAdminLayoutSessionHeaderValue: (...args: unknown[]) =>
    buildAdminLayoutSessionHeaderValueMock(...args),
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
      }) =>
      (request: {
        url: string;
        nextUrl: { pathname: string; search: string };
        headers: Headers;
        cookies: {
          get: (name: string) => { value: string } | undefined;
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

        if (pathLocale) {
          return targetPathname === pathname
            ? NextResponse.next()
            : NextResponse.redirect(new URL(targetPathname, request.url));
        }

        if (targetPathname !== pathname) {
          return NextResponse.redirect(new URL(targetPathname, request.url));
        }

        const internalPathname =
          locale === defaultLocale ? `/${defaultLocale}${pathname === '/' ? '' : pathname}` : pathname;
        return NextResponse.rewrite(new URL(internalPathname, request.url));
      },
  };
});

import { proxy } from './proxy';

const createRequest = (
  url: string,
  options?: {
    csrfToken?: string;
    auth?: unknown;
    acceptLanguage?: string;
    localeCookie?: string;
    method?: string;
  }
): {
  url: string;
  method: string;
  nextUrl: URL & { clone: () => URL };
  headers: Headers;
  cookies: { get: (name: string) => { value: string } | undefined };
  auth?: unknown;
} => {
  const parsed = new URL(url);
  const nextUrl = parsed as URL & { clone: () => URL };
  nextUrl.clone = () => new URL(nextUrl.toString());
  const headers = new Headers();
  if (options?.acceptLanguage) {
    headers.set('accept-language', options.acceptLanguage);
  }

  return {
    url: parsed.toString(),
    method: options?.method ?? 'GET',
    nextUrl,
    headers,
    cookies: {
      get: (name: string) =>
        name === 'csrf-token' && options?.csrfToken
          ? { value: options.csrfToken }
          : name === 'NEXT_LOCALE' && options?.localeCookie
            ? { value: options.localeCookie }
            : undefined,
    },
    auth: options?.auth,
  };
};

describe('cms builder proxy', () => {
  beforeEach(() => {
    authorizedMock.mockReset();
    buildAdminLayoutSessionHeaderValueMock.mockReset();
    ensureCsrfCookieMock.mockReset();
    authInvokeMock.mockReset();
    authInvokeMock.mockImplementation(
      (
        handler: (request: unknown, context: unknown) => Response | Promise<Response>,
        request: unknown,
        context: unknown
      ) => handler(request, context)
    );
  });

  it('canonicalizes /cms aliases to /admin/cms paths', async () => {
    const request = createRequest('http://localhost/cms/pages?tab=published', {
      csrfToken: 'csrf-1',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin/cms/pages?tab=published');
    expect(authInvokeMock).not.toHaveBeenCalled();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
    expect(ensureCsrfCookieMock).toHaveBeenCalledWith(response, 'csrf-1');
  });

  it('redirects anonymous CMS admin requests to the local sign-in page', async () => {
    authorizedMock.mockResolvedValue(false);
    const request = createRequest('http://localhost/admin/cms/pages?tab=drafts');

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/signin?callbackUrl=%2Fadmin%2Fcms%2Fpages%3Ftab%3Ddrafts'
    );
    expect(authInvokeMock).toHaveBeenCalledTimes(1);
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('forwards the admin layout session header for authorized CMS admin requests', async () => {
    const auth = {
      user: {
        id: 'user-1',
        permissions: ['settings.manage'],
        roleAssigned: true,
      },
    };
    authorizedMock.mockResolvedValue(true);
    buildAdminLayoutSessionHeaderValueMock.mockReturnValue('session:user-1');
    const request = createRequest('http://localhost/admin/cms/pages', { auth });

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-forwarded-admin-layout-session')).toBe('session:user-1');
    expect(authorizedMock).toHaveBeenCalledWith({
      auth,
      request: { nextUrl: request.nextUrl },
    });
  });

  it('passes non-CMS page requests through without auth', async () => {
    const request = createRequest('http://localhost/auth/signin');

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(authInvokeMock).not.toHaveBeenCalled();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('rewrites default-locale public CMS slugs through the localized route tree', async () => {
    const request = createRequest('http://localhost/about', {
      acceptLanguage: 'pl-PL,pl;q=0.9',
    });

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost/pl/about');
    expect(authInvokeMock).not.toHaveBeenCalled();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });

  it('passes explicit non-default locale CMS slugs through and syncs the locale cookie', async () => {
    const request = createRequest('http://localhost/en/about');

    const response = await Promise.resolve(proxy(request as never, { params: {} } as never));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toContain('NEXT_LOCALE=en');
    expect(authInvokeMock).not.toHaveBeenCalled();
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });
});
