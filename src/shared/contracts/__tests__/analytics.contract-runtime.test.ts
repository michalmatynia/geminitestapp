import { describe, expect, it } from 'vitest';

import {
  analyticsEventCreateRequestSchema,
  analyticsEventsQuerySchema,
  analyticsSummaryQuerySchema,
} from '@/shared/contracts/analytics';

describe('analytics contract runtime', () => {
  it('parses analytics event create requests', () => {
    expect(
      analyticsEventCreateRequestSchema.parse({
        type: 'pageview',
        scope: 'public',
        path: '/products/widget',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        viewport: {
          width: 390,
          height: 844,
        },
        screen: {
          width: 390,
          height: 844,
          dpr: 3,
        },
      }).path
    ).toBe('/products/widget');
  });

  it('parses analytics events query filters and defaults', () => {
    const parsed = analyticsEventsQuerySchema.parse({
      page: '2',
      pageSize: '25',
      range: '7d',
      scope: 'public',
      type: 'pageview',
      search: 'google',
      country: 'PL',
      referrerHost: 'google.com',
      browser: 'Chrome',
      device: 'desktop',
      bot: 'humans',
    });

    expect(parsed).toMatchObject({
      page: 2,
      pageSize: 25,
      range: '7d',
      scope: 'public',
      type: 'pageview',
      search: 'google',
      country: 'PL',
      referrerHost: 'google.com',
      browser: 'Chrome',
      device: 'desktop',
      bot: 'humans',
    });

    expect(analyticsEventsQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      range: '24h',
      scope: 'all',
      type: 'all',
      search: '',
      country: '',
      referrerHost: '',
      browser: '',
      device: '',
      bot: 'all',
    });
  });

  it('parses analytics summary query defaults', () => {
    expect(analyticsSummaryQuerySchema.parse({})).toMatchObject({
      range: '24h',
      scope: 'all',
    });
  });
});
