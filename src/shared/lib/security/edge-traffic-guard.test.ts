import { beforeEach, describe, expect, it } from 'vitest';

import { applyEdgeTrafficGuard, resetEdgeTrafficGuardState } from './edge-traffic-guard';

const createRequest = (
  pathname: string,
  options?: { userAgent?: string; cookie?: string; method?: string; ip?: string }
) =>
  ({
    method: options?.method ?? 'GET',
    nextUrl: { pathname },
    headers: new Headers({
      ...(options?.userAgent ? { 'user-agent': options.userAgent } : {}),
      ...(options?.cookie ? { cookie: options.cookie } : {}),
      ...(options?.ip ? { 'x-forwarded-for': options.ip } : {}),
    }),
  }) as never;

describe('edge traffic guard', () => {
  beforeEach(() => {
    resetEdgeTrafficGuardState();
  });

  it('blocks repeated anonymous scraper requests on the same public page', () => {
    const request = createRequest('/', {
      userAgent: 'curl/8.7.1',
      ip: '203.0.113.10',
    });

    expect(
      applyEdgeTrafficGuard(request, {
        suspiciousPageMax: 2,
        blockMs: 30_000,
        suspiciousBlockMs: 30_000,
      })
    ).toBeNull();
    expect(
      applyEdgeTrafficGuard(request, {
        suspiciousPageMax: 2,
        blockMs: 30_000,
        suspiciousBlockMs: 30_000,
      })
    ).toBeNull();

    const response = applyEdgeTrafficGuard(request, {
      suspiciousPageMax: 2,
      blockMs: 30_000,
      suspiciousBlockMs: 30_000,
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get('x-traffic-guard')).toBe('public-page-burst');
    expect(response?.headers.get('retry-after')).toBeTruthy();
  });

  it('bypasses the guard for authenticated browserless internal traffic', () => {
    const request = createRequest('/kangur', {
      userAgent: 'Playwright/1.52.0',
      cookie: '__Secure-next-auth.session-token=session-token',
      ip: '203.0.113.11',
    });

    expect(
      applyEdgeTrafficGuard(request, {
        suspiciousPageMax: 1,
      })
    ).toBeNull();
    expect(
      applyEdgeTrafficGuard(request, {
        suspiciousPageMax: 1,
      })
    ).toBeNull();
  });

  it('allows known search bots to pass through without page burst throttling', () => {
    const request = createRequest('/products/123', {
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ip: '203.0.113.12',
    });

    expect(
      applyEdgeTrafficGuard(request, {
        pageMax: 1,
      })
    ).toBeNull();
    expect(
      applyEdgeTrafficGuard(request, {
        pageMax: 1,
      })
    ).toBeNull();
  });
});
