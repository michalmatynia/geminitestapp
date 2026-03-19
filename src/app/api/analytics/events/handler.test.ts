import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { authMock, listAnalyticsEventsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  listAnalyticsEventsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  extractClientIp: vi.fn(),
}));

vi.mock('@/shared/lib/analytics/server', () => ({
  insertAnalyticsEvent: vi.fn(),
  listAnalyticsEvents: listAnalyticsEventsMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-analytics-events-1',
    traceId: 'trace-analytics-events-1',
    correlationId: 'corr-analytics-events-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('analytics events handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
      },
    });
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
    });
  });

  it('omits optional scope and type filters when all values are selected', async () => {
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
      })
    );

    expect(listAnalyticsEventsMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
      limit: 20,
      skip: 0,
    });
  });
});
