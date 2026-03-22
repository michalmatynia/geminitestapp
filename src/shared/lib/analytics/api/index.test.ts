import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { fetchAnalyticsEvents, fetchAnalyticsSummary } from '@/shared/lib/analytics/api';

describe('analytics api client', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('requests the analytics summary with default params', async () => {
    apiGetMock.mockResolvedValue({ totals: {} });

    await fetchAnalyticsSummary();

    expect(apiGetMock).toHaveBeenCalledWith('/api/analytics/summary', {
      params: { range: '24h', scope: 'all' },
    });
  });

  it('requests analytics events with explicit filters and defaults the rest', async () => {
    apiGetMock.mockResolvedValue({ items: [] });

    await fetchAnalyticsEvents({
      page: 3,
      range: '7d',
      scope: 'admin',
      type: 'pageview',
      search: 'kangur',
      country: 'PL',
      referrerHost: 'google.com',
      browser: 'Chrome',
      device: 'desktop',
      bot: 'exclude_bots',
    });

    expect(apiGetMock).toHaveBeenCalledWith('/api/analytics/events', {
      params: {
        page: 3,
        pageSize: 25,
        range: '7d',
        scope: 'admin',
        type: 'pageview',
        search: 'kangur',
        country: 'PL',
        referrerHost: 'google.com',
        browser: 'Chrome',
        device: 'desktop',
        bot: 'exclude_bots',
      },
    });
  });
});
