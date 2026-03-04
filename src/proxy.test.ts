import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureCsrfCookieMock } = vi.hoisted(() => ({
  ensureCsrfCookieMock: vi.fn(),
}));

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static next() {
      return new MockNextResponse(null, {
        status: 200,
        headers: { 'x-middleware-next': '1' },
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
  }

  return {
    NextResponse: MockNextResponse,
  };
});

vi.mock('@/features/auth/server', () => ({
  auth: undefined,
}));

vi.mock('@/shared/lib/security/csrf', () => ({
  CSRF_COOKIE_NAME: 'csrf-token',
  ensureCsrfCookie: (...args: unknown[]) => ensureCsrfCookieMock(...args),
}));

import { proxy } from '@/proxy';

const createRequest = (
  url: string,
  csrfToken?: string
): {
  nextUrl: { pathname: string; search: string };
  cookies: { get: (name: string) => { value: string } | undefined };
} => {
  const parsed = new URL(url);
  return {
    nextUrl: {
      pathname: parsed.pathname,
      search: parsed.search,
    },
    cookies: {
      get: (name: string) =>
        name === 'csrf-token' && csrfToken ? { value: csrfToken } : undefined,
    },
  };
};

describe('proxy legacy products deprecation', () => {
  beforeEach(() => {
    ensureCsrfCookieMock.mockReset();
  });

  it('returns 410 for legacy /api/products paths with successor metadata', async () => {
    const request = createRequest(
      'http://localhost/api/products/categories/tree?catalogId=catalog-1&fresh=1'
    );

    const response = await Promise.resolve(proxy(request as never, { params: {} }));
    const payload = (await response.json()) as {
      error: string;
      successorPath: string;
      deprecatedPath: string;
      deprecatedOn: string;
    };

    expect(response.status).toBe(410);
    expect(response.headers.get('Sunset')).toBe('2026-03-04');
    expect(response.headers.get('Link')).toBe(
      '</api/v2/products/categories/tree?catalogId=catalog-1&fresh=1>; rel="successor-version"'
    );
    expect(payload).toEqual({
      error: 'Deprecated API route',
      message:
        'Legacy products API routes were retired on 2026-03-04. Use /api/v2/products endpoints.',
      deprecatedPath: '/api/products/categories/tree?catalogId=catalog-1&fresh=1',
      successorPath: '/api/v2/products/categories/tree?catalogId=catalog-1&fresh=1',
      deprecatedOn: '2026-03-04',
    });
    expect(ensureCsrfCookieMock).not.toHaveBeenCalled();
  });

  it('allows /api/v2/products paths through base proxy flow', async () => {
    const request = createRequest('http://localhost/api/v2/products?page=1');

    const response = await Promise.resolve(proxy(request as never, { params: {} }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(ensureCsrfCookieMock).toHaveBeenCalledTimes(1);
  });
});
