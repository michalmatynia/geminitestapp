import { beforeEach, describe, expect, it, vi } from 'vitest';

const { intlProxyMock } = vi.hoisted(() => ({
  intlProxyMock: vi.fn(),
}));

vi.mock('next-intl/middleware', () => ({
  default: () => intlProxyMock,
}));

import proxy from './proxy';

const createRequest = (pathname: string) =>
  ({
    nextUrl: {
      pathname,
    },
  }) as never;

describe('apps/studiq-web proxy', () => {
  beforeEach(() => {
    intlProxyMock.mockReset();
    intlProxyMock.mockReturnValue(
      new Response(null, {
        status: 200,
        headers: {
          'x-intl': '1',
        },
      })
    );
  });

  it('adds no-store headers to localized Kangur page responses', () => {
    const response = proxy(createRequest('/en/kangur/lessons'));

    expect(response.headers.get('x-intl')).toBe('1');
    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, max-age=0, must-revalidate'
    );
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('x-middleware-cache')).toBe('no-cache');
  });

  it('leaves non-Kangur page responses alone', () => {
    const response = proxy(createRequest('/en/admin'));

    expect(response.headers.get('x-intl')).toBe('1');
    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(response.headers.get('CDN-Cache-Control')).toBeNull();
  });
});
