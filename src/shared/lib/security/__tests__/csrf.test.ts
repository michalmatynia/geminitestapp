import { describe, expect, it } from 'vitest';
import { beforeEach, vi } from 'vitest';

type RequestLike = {
  headers: Headers;
  nextUrl: URL;
};

let csrf: typeof import('@/shared/lib/security/csrf');

const makeRequest = ({
  url = 'http://localhost/api/test',
  headers = {},
}: {
  url?: string;
  headers?: Record<string, string>;
}): RequestLike =>
  ({
    headers: new Headers(headers),
    nextUrl: new URL(url),
  }) as RequestLike;

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('next/server');
  csrf = await import('@/shared/lib/security/csrf');
});

describe('csrf header parsing canonical contract', () => {
  it('returns token from canonical x-csrf-token header', () => {
    const request = makeRequest({
      headers: {
        'x-csrf-token': 'canonical-token',
      },
    });

    expect(csrf.getCsrfTokenFromHeaders(request as never)).toBe('canonical-token');
  });

  it('ignores legacy x-xsrf-token header alias', () => {
    const request = makeRequest({
      headers: {
        'x-xsrf-token': 'legacy-token',
      },
    });

    expect(csrf.getCsrfTokenFromHeaders(request as never)).toBeNull();
  });
});

describe('csrf same-origin matching', () => {
  it('accepts exact same-origin requests', () => {
    const request = makeRequest({
      url: 'http://localhost:3101/api/test',
      headers: {
        origin: 'http://localhost:3101',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(true);
  });

  it('accepts loopback localhost and 127.0.0.1 as equivalent origins', () => {
    const request = makeRequest({
      url: 'http://127.0.0.1:3101/api/test',
      headers: {
        origin: 'http://localhost:3101',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(true);
  });

  it('accepts localhost and 0.0.0.0 as equivalent local dev origins', () => {
    const request = makeRequest({
      url: 'http://0.0.0.0:3101/api/test',
      headers: {
        origin: 'http://localhost:3101',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(true);
  });

  it('prefers forwarded host headers over the internal request URL origin', () => {
    const request = makeRequest({
      url: 'http://localhost:3000/api/test',
      headers: {
        origin: 'http://localhost:3101',
        host: 'localhost:3101',
        'x-forwarded-proto': 'http',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(true);
  });

  it('rejects loopback origins when the port differs', () => {
    const request = makeRequest({
      url: 'http://127.0.0.1:3101/api/test',
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(false);
  });

  it('rejects non-loopback cross-origin requests', () => {
    const request = makeRequest({
      url: 'https://admin.example.com/api/test',
      headers: {
        origin: 'https://evil.example.com',
      },
    });

    expect(csrf.isSameOriginRequest(request as never)).toBe(false);
  });
});
