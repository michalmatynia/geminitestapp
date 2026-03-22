import { describe, expect, it } from 'vitest';

import {
  buildAnalyticsRequestMeta,
  deriveAnalyticsReferrerHost,
  mergeAnalyticsMeta,
  parseAnalyticsUserAgent,
} from './enrichment';

describe('analytics enrichment helpers', () => {
  it('derives referrer hosts and parses user agents', () => {
    expect(deriveAnalyticsReferrerHost(' https://google.com/search?q=kangur ')).toBe('google.com');
    expect(deriveAnalyticsReferrerHost('not-a-url')).toBeUndefined();

    expect(
      parseAnalyticsUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1'
      )
    ).toEqual({
      browser: 'Safari',
      os: 'iOS',
      device: 'mobile',
      isBot: false,
    });

    expect(parseAnalyticsUserAgent('Playwright bot')).toMatchObject({
      browser: 'Unknown',
      device: 'bot',
      isBot: true,
    });
  });

  it('builds request meta and merges it with client meta when present', () => {
    const req = {
      headers: new Headers({
        host: 'kangur.example',
        'x-forwarded-host': 'proxy.example',
        'x-forwarded-proto': 'https',
      }),
    } as never;

    expect(buildAnalyticsRequestMeta(req)).toEqual({
      host: 'kangur.example',
      forwardedHost: 'proxy.example',
      forwardedProto: 'https',
      forwardedPort: undefined,
    });

    expect(
      mergeAnalyticsMeta(
        {
          client: { browser: 'Chrome' },
        },
        buildAnalyticsRequestMeta(req)
      )
    ).toEqual({
      client: { browser: 'Chrome' },
      request: {
        host: 'kangur.example',
        forwardedHost: 'proxy.example',
        forwardedProto: 'https',
        forwardedPort: undefined,
      },
    });

    expect(mergeAnalyticsMeta(null, undefined)).toBeUndefined();
  });
});
