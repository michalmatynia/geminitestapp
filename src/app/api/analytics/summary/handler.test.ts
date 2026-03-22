import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { authMock, getAnalyticsSummaryMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getAnalyticsSummaryMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/shared/lib/analytics/server', () => ({
  getAnalyticsSummary: getAnalyticsSummaryMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-analytics-summary-1',
    traceId: 'trace-analytics-summary-1',
    correlationId: 'corr-analytics-summary-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('analytics summary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
      },
    });
    getAnalyticsSummaryMock.mockResolvedValue({
      from: '2026-03-21T00:00:00.000Z',
      to: '2026-03-22T00:00:00.000Z',
      scope: 'public',
      totals: { events: 10, pageviews: 6 },
      visitors: 5,
      sessions: 4,
      topPages: [],
      topReferrers: [],
      topEventNames: [],
      topLanguages: [],
      topCountries: [],
      topRegions: [],
      topCities: [],
      topBrowsers: [],
      topOs: [],
      topDevices: [],
      topUtmSources: [],
      topUtmMediums: [],
      topUtmCampaigns: [],
      recent: [],
    });
  });

  it('uses default summary query values when filters are omitted', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/analytics/summary'),
      createRequestContext({})
    );

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(getAnalyticsSummaryMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
    });
    expect(response.status).toBe(200);
  });

  it('passes scope and range filters through to the repository', async () => {
    await GET_handler(
      new NextRequest('http://localhost/api/analytics/summary'),
      createRequestContext({
        range: '7d',
        scope: 'public',
      })
    );

    expect(getAnalyticsSummaryMock).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
      scope: 'public',
    });
  });
});
