import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureCsrfCookieMock } = vi.hoisted(() => ({
  ensureCsrfCookieMock: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();

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
});
