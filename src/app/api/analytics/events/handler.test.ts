import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  authMock,
  extractClientIpMock,
  insertAnalyticsEventMock,
  listAnalyticsEventsMock,
  readOptionalServerAuthSessionMock,
} =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    extractClientIpMock: vi.fn(),
    insertAnalyticsEventMock: vi.fn(),
    listAnalyticsEventsMock: vi.fn(),
    readOptionalServerAuthSessionMock: vi.fn(),
  }));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  extractClientIp: extractClientIpMock,
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/shared/lib/analytics/server', () => ({
  insertAnalyticsEvent: insertAnalyticsEventMock,
  listAnalyticsEvents: listAnalyticsEventsMock,
}));

import {
  GET_handler,
  POST_handler,
  resetAnalyticsEventsIngestionGuardState,
} from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-analytics-events-1',
    traceId: 'trace-analytics-events-1',
    correlationId: 'corr-analytics-events-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

const buildAnalyticsEventRequestPayload = (
  overrides: Record<string, unknown>
): Record<string, unknown> => ({
  type: 'pageview',
  scope: 'public',
  path: '/products/widget',
  search: '?utm_source=google',
  referrer: 'https://www.google.com/search?q=widget',
  visitorId: 'visitor-1',
  sessionId: 'session-1',
  meta: {
    client: {
      onLine: true,
    },
    performance: {
      navigationType: 'navigate',
    },
  },
  clientTs: '2026-03-19T10:00:00.000Z',
  ...overrides,
});

describe('analytics events handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetAnalyticsEventsIngestionGuardState();
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
      },
    });
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
      },
    });
    extractClientIpMock.mockReturnValue('203.0.113.42');
    insertAnalyticsEventMock.mockResolvedValue({ id: 'analytics-event-created-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes pagination and pageview filters through to the repository', async () => {
    listAnalyticsEventsMock.mockResolvedValue({
      events: [
        {
          id: 'analytics-event-1',
          createdAt: '2026-03-19T10:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
          ts: '2026-03-19T10:00:00.000Z',
          type: 'pageview',
          scope: 'public',
          path: '/',
          visitorId: 'visitor-1',
          sessionId: 'session-1',
        },
      ],
      total: 41,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/analytics/events'),
      createRequestContext({
        page: 2,
        pageSize: 25,
        range: '7d',
        scope: 'public',
        type: 'pageview',
      })
    );

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(listAnalyticsEventsMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
      scope: 'public',
      type: 'pageview',
      limit: 25,
      skip: 25,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: [
        {
          id: 'analytics-event-1',
          createdAt: '2026-03-19T10:00:00.000Z',
          updatedAt: '2026-03-19T10:00:00.000Z',
          ts: '2026-03-19T10:00:00.000Z',
          type: 'pageview',
          scope: 'public',
          path: '/',
          visitorId: 'visitor-1',
          sessionId: 'session-1',
        },
      ],
      page: 2,
      pageSize: 25,
      total: 41,
      totalPages: 2,
      range: '7d',
      scope: 'public',
      type: 'pageview',
      search: '',
      country: '',
      referrerHost: '',
      browser: '',
      device: '',
      bot: 'all',
    });
  });

  it('passes connection search and filter params through to the repository', async () => {
    listAnalyticsEventsMock.mockResolvedValue({
      events: [],
      total: 0,
    });

    await GET_handler(
      new NextRequest('http://localhost/api/analytics/events'),
      createRequestContext({
        page: 1,
        pageSize: 20,
        range: '24h',
        scope: 'public',
        type: 'pageview',
        search: 'google',
        country: 'PL',
        referrerHost: 'google.com',
        browser: 'Chrome',
        device: 'desktop',
        bot: 'humans',
      })
    );

    expect(listAnalyticsEventsMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
      scope: 'public',
      type: 'pageview',
      search: 'google',
      country: 'PL',
      referrerHost: 'google.com',
      browser: 'Chrome',
      device: 'desktop',
      isBot: false,
      limit: 20,
      skip: 0,
    });
  });

  it('omits optional analytics event filters when all values are selected', async () => {
    listAnalyticsEventsMock.mockResolvedValue({
      events: [],
      total: 0,
    });

    await GET_handler(
      new NextRequest('http://localhost/api/analytics/events'),
      createRequestContext({
        page: 1,
        pageSize: 20,
        range: '24h',
        scope: 'all',
        type: 'all',
        search: '',
        country: '',
        referrerHost: '',
        browser: '',
        device: 'all',
        bot: 'all',
      })
    );

    expect(listAnalyticsEventsMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
      limit: 20,
      skip: 0,
    });
  });

  it('enriches created events with parsed connection context before inserting', async () => {
    const requestPayload = buildAnalyticsEventRequestPayload({});
    const response = await POST_handler(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          host: 'kangur.example',
          'x-forwarded-host': 'kangur.example',
          'x-forwarded-proto': 'https',
          'x-forwarded-port': '443',
          'x-vercel-ip-country': 'PL',
          'x-vercel-ip-country-region': 'Mazowieckie',
          'x-vercel-ip-city': 'Warsaw',
        },
        body: JSON.stringify(requestPayload),
      }),
      createRequestContext({})
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(insertAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pageview',
        scope: 'public',
        path: '/products/widget',
        search: '?utm_source=google',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        userId: 'user-1',
        referrerHost: 'www.google.com',
        ua: {
          browser: 'Chrome',
          os: 'macOS',
          device: 'desktop',
          isBot: false,
        },
        meta: {
          client: {
            onLine: true,
          },
          performance: {
            navigationType: 'navigate',
          },
          request: {
            host: 'kangur.example',
            forwardedHost: 'kangur.example',
            forwardedProto: 'https',
            forwardedPort: '443',
          },
        },
      }),
      {
        ip: '203.0.113.42',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        country: 'PL',
        region: 'Mazowieckie',
        city: 'Warsaw',
      }
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        queued: true,
        requestId: 'request-analytics-events-1',
      })
    );
  });

  it('deduplicates identical analytics event payloads from retry loops', async () => {
    const requestPayload = buildAnalyticsEventRequestPayload({});

    const firstResponse = await POST_handler(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }),
      createRequestContext({})
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondResponse = await POST_handler(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }),
      createRequestContext({})
    );

    expect(firstResponse.status).toBe(202);
    expect(insertAnalyticsEventMock).toHaveBeenCalledTimes(1);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get('x-analytics-event-guard')).toBe('deduplicated');
    await expect(secondResponse.json()).resolves.toMatchObject({
      ok: true,
      queued: false,
      deduplicated: true,
      requestId: 'request-analytics-events-1',
    });
  });

  it('allows the same analytics event payload again after the dedupe window expires', async () => {
    vi.useFakeTimers();
    const requestPayload = buildAnalyticsEventRequestPayload({});

    const firstRequest = POST_handler(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }),
      createRequestContext({})
    );

    await expect(firstRequest).resolves.toHaveProperty('status', 202);
    await vi.runAllTimersAsync();

    await vi.advanceTimersByTimeAsync(30_001);

    const secondRequest = POST_handler(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }),
      createRequestContext({})
    );

    await expect(secondRequest).resolves.toHaveProperty('status', 202);
    await vi.runAllTimersAsync();

    expect(insertAnalyticsEventMock).toHaveBeenCalledTimes(2);
  });
});
