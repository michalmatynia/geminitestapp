/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mongoDb: null as any,
  redis: null as any,
  captureException: vi.fn(),
  createIndex: vi.fn(async () => 'idx'),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(async () => state.mongoDb),
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: vi.fn(() => state.redis),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (error: unknown) => state.captureException(error),
  },
}));

const makeFindCursor = (docs: unknown[]) => {
  const cursor = {
    sort: vi.fn(() => cursor),
    skip: vi.fn(() => cursor),
    limit: vi.fn(() => cursor),
    toArray: vi.fn(async () => docs),
  };
  return cursor;
};

const makeAggregateCursor = (docs: unknown[]) => ({
  toArray: vi.fn(async () => docs),
});

describe('analytics server repository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.createIndex = vi.fn(async () => 'idx');
    state.captureException = vi.fn();
    state.redis = null;
    state.mongoDb = null;
    delete process.env['ANALYTICS_IP_MODE'];
    delete process.env['ANALYTICS_IP_SALT'];
    delete process.env['NEXTAUTH_SECRET'];
  });

  it('inserts analytics events with masked IPs by default and bumps cache version when redis exists', async () => {
    const insertOne = vi.fn(async () => ({ insertedId: { toString: () => 'event-1' } }));
    const collection = {
      createIndex: state.createIndex,
      insertOne,
    };
    const redis = {
      get: vi.fn(async (key: string) => {
        if (key.endsWith(':last_bump')) return null;
        if (key.endsWith(':version')) return '5';
        return null;
      }),
      incr: vi.fn(async () => 6),
      set: vi.fn(async () => 'OK'),
    };
    state.mongoDb = {
      collection: vi.fn(() => collection),
    };
    state.redis = redis;

    const { insertAnalyticsEvent } = await import('./repository');

    const result = await insertAnalyticsEvent(
      {
        type: 'pageview',
        scope: 'frontend',
        path: '/pricing',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        search: ' q=chairs ',
        url: ' https://example.com/pricing ',
        title: ' Pricing ',
        referrer: ' https://google.com ',
        referrerHost: ' google.com ',
        userId: ' user-1 ',
        language: ' en ',
        languages: ['en', 'pl'],
        timeZone: ' Europe/Warsaw ',
        viewport: { width: 1200, height: 800 },
        screen: { width: 1728, height: 1117 },
        connection: { effectiveType: '4g', downlink: 1.5, rtt: 120, saveData: false },
        meta: { plan: 'pro' },
        clientTs: '2026-03-27T12:00:00.000Z',
        ua: { browser: 'Chrome', os: 'macOS', device: 'desktop', isBot: false },
        utm: { source: ' google ', medium: ' cpc ', campaign: ' spring ' },
      } as any,
      {
        ip: '192.168.0.55',
        userAgent: ' Mozilla/5.0 ',
        country: ' PL ',
        region: ' Zachodniopomorskie ',
        city: ' Szczecin ',
      }
    );

    expect(result).toEqual({ id: 'event-1' });
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'pageview',
        scope: 'frontend',
        path: '/pricing',
        search: 'q=chairs',
        url: 'https://example.com/pricing',
        title: 'Pricing',
        referrer: 'https://google.com',
        referrerHost: 'google.com',
        userId: 'user-1',
        language: 'en',
        languages: ['en', 'pl'],
        timeZone: 'Europe/Warsaw',
        ipMasked: '192.168.0.0',
        userAgent: 'Mozilla/5.0',
        country: 'PL',
        region: 'Zachodniopomorskie',
        city: 'Szczecin',
        utm: {
          source: 'google',
          medium: 'cpc',
          campaign: 'spring',
        },
      })
    );
    expect(redis.incr).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalled();
  });

  it('supports full, hash, and none IP modes', async () => {
    const insertOne = vi.fn(async () => ({ insertedId: { toString: () => 'event-2' } }));
    state.mongoDb = {
      collection: vi.fn(() => ({
        createIndex: state.createIndex,
        insertOne,
      })),
    };

    const { insertAnalyticsEvent } = await import('./repository');

    process.env['ANALYTICS_IP_MODE'] = 'full';
    process.env['ANALYTICS_IP_SALT'] = 'salt';
    await insertAnalyticsEvent(
      {
        type: 'click',
        scope: 'frontend',
        path: '/app',
        visitorId: 'v1',
        sessionId: 's1',
      } as any,
      { ip: '2001:db8:1234:5678::1' }
    );
    expect(insertOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ip: '2001:db8:1234:5678::1',
        ipMasked: '2001:db8:1234:xxxx:xxxx:xxxx:xxxx',
        ipHash: expect.any(String),
      })
    );

    process.env['ANALYTICS_IP_MODE'] = 'hash';
    await insertAnalyticsEvent(
      {
        type: 'click',
        scope: 'frontend',
        path: '/app',
        visitorId: 'v2',
        sessionId: 's2',
      } as any,
      { ip: '10.0.0.8' }
    );
    expect(insertOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ipHash: expect.any(String),
      })
    );
    expect(insertOne.mock.calls.at(-1)?.[0]).not.toHaveProperty('ip');
    expect(insertOne.mock.calls.at(-1)?.[0]).not.toHaveProperty('ipMasked');

    process.env['ANALYTICS_IP_MODE'] = 'none';
    await insertAnalyticsEvent(
      {
        type: 'click',
        scope: 'frontend',
        path: '/app',
        visitorId: 'v3',
        sessionId: 's3',
      } as any,
      { ip: '10.0.0.9' }
    );
    expect(insertOne.mock.calls.at(-1)?.[0]).not.toHaveProperty('ip');
    expect(insertOne.mock.calls.at(-1)?.[0]).not.toHaveProperty('ipMasked');
    expect(insertOne.mock.calls.at(-1)?.[0]).not.toHaveProperty('ipHash');
  });

  it('lists events from cache when available and tolerates cache parse failures', async () => {
    const docs = [
      {
        _id: { toString: () => 'event-3' },
        createdAt: new Date('2026-03-27T10:00:00.000Z'),
        updatedAt: new Date('2026-03-27T10:00:00.000Z'),
        ts: new Date('2026-03-27T10:00:00.000Z'),
        type: 'pageview',
        scope: 'frontend',
        path: '/docs',
        visitorId: 'visitor-2',
        sessionId: 'session-2',
        ua: { browser: 'Chrome', os: 'macOS', device: 'desktop', isBot: false },
      },
    ];
    const findCursor = makeFindCursor(docs);
    const countDocuments = vi.fn(async () => 1);
    const collection = {
      createIndex: state.createIndex,
      find: vi.fn(() => findCursor),
      countDocuments,
    };
    state.mongoDb = {
      collection: vi.fn(() => collection),
    };

    const cacheHits = [
      JSON.stringify({
        events: [{ id: 'cached-event' }],
        total: 99,
      }),
      '{broken-json',
      null,
    ];
    state.redis = {
      get: vi.fn(async (key: string) => {
        if (key.endsWith(':version')) return '7';
        return cacheHits.shift() ?? null;
      }),
      set: vi.fn(async () => 'OK'),
    };

    const { listAnalyticsEvents } = await import('./repository');

    await expect(
      listAnalyticsEvents({
        from: new Date('2026-03-27T00:00:00.000Z'),
        to: new Date('2026-03-28T00:00:00.000Z'),
        limit: 25,
        skip: 0,
      })
    ).resolves.toEqual({
      events: [{ id: 'cached-event' }],
      total: 99,
    });

    const uncached = await listAnalyticsEvents({
      from: new Date('2026-03-27T00:00:00.000Z'),
      to: new Date('2026-03-28T00:00:00.000Z'),
      scope: 'frontend',
      type: 'pageview',
      search: 'docs',
      country: 'pl',
      referrerHost: 'google',
      browser: 'chrome',
      device: 'desktop',
      isBot: false,
      limit: 25,
      skip: 5,
    });

    expect(state.captureException).toHaveBeenCalledTimes(1);
    expect(uncached).toEqual({
      events: [
        expect.objectContaining({
          id: 'event-3',
          path: '/docs',
        }),
      ],
      total: 1,
    });
    expect(collection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'frontend',
        type: 'pageview',
        country: { $regex: 'pl', $options: 'i' },
        referrerHost: { $regex: 'google', $options: 'i' },
        'ua.browser': { $regex: 'chrome', $options: 'i' },
        'ua.device': { $regex: '^desktop$', $options: 'i' },
        'ua.isBot': false,
        $or: expect.any(Array),
      })
    );
    expect(findCursor.skip).toHaveBeenCalledWith(5);
    expect(findCursor.limit).toHaveBeenCalledWith(25);
    expect(countDocuments).toHaveBeenCalledTimes(1);
    expect(state.redis.set).toHaveBeenCalledTimes(1);
  });

  it('builds analytics summaries from aggregates and tolerates summary cache parse failures', async () => {
    const aggregate = vi
      .fn()
      .mockReturnValueOnce(makeAggregateCursor([{ events: 12, pageviews: 8 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ count: 4 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ count: 3 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ path: '/docs', count: 5 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ referrer: 'https://google.com', count: 2 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ language: 'en', count: 7 }]))
      .mockReturnValueOnce(makeAggregateCursor([{ country: 'PL', count: 6 }]));
    const recentCursor = {
      sort: vi.fn(() => recentCursor),
      limit: vi.fn(() => recentCursor),
      toArray: vi.fn(async () => [
        {
          _id: { toString: () => 'event-4' },
          createdAt: new Date('2026-03-27T11:00:00.000Z'),
          updatedAt: null,
          ts: new Date('2026-03-27T11:00:00.000Z'),
          type: 'pageview',
          scope: 'frontend',
          path: '/landing',
          visitorId: 'visitor-3',
          sessionId: 'session-3',
        },
      ]),
    };
    state.mongoDb = {
      collection: vi.fn(() => ({
        createIndex: state.createIndex,
        aggregate,
        find: vi.fn(() => recentCursor),
      })),
    };
    state.redis = {
      get: vi.fn(async (key: string) => {
        if (key.endsWith(':version')) return '9';
        return '{broken-json';
      }),
      set: vi.fn(async () => 'OK'),
    };

    const { getAnalyticsSummary } = await import('./repository');

    const summary = await getAnalyticsSummary({
      from: new Date('2026-03-27T00:00:00.000Z'),
      to: new Date('2026-03-28T00:00:00.000Z'),
      scope: 'frontend',
    });

    expect(state.captureException).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({
      from: '2026-03-27T00:00:00.000Z',
      to: '2026-03-28T00:00:00.000Z',
      scope: 'frontend',
      totals: { events: 12, pageviews: 8 },
      visitors: 4,
      sessions: 3,
      topPages: [{ path: '/docs', count: 5 }],
      topReferrers: [{ referrer: 'https://google.com', count: 2 }],
      topEventNames: [],
      topLanguages: [{ language: 'en', count: 7 }],
      topCountries: [{ country: 'PL', count: 6 }],
      topRegions: [],
      topCities: [],
      topBrowsers: [],
      topOs: [],
      topDevices: [],
      topUtmSources: [],
      topUtmMediums: [],
      topUtmCampaigns: [],
      recent: [expect.objectContaining({ id: 'event-4', path: '/landing' })],
    });
    expect(recentCursor.limit).toHaveBeenCalledWith(50);
    expect(state.redis.set).toHaveBeenCalledTimes(1);
  });

  it('clears analytics events with optional filters and no-redis cache bump path', async () => {
    const deleteMany = vi.fn(async () => ({ deletedCount: 7 }));
    state.mongoDb = {
      collection: vi.fn(() => ({
        createIndex: state.createIndex,
        deleteMany,
      })),
    };
    state.redis = null;

    const { clearAnalyticsEvents } = await import('./repository');

    await expect(clearAnalyticsEvents()).resolves.toEqual({ deleted: 7 });
    expect(deleteMany).toHaveBeenNthCalledWith(1, {});

    await expect(
      clearAnalyticsEvents({
        before: new Date('2026-03-26T00:00:00.000Z'),
        type: 'pageview',
      })
    ).resolves.toEqual({ deleted: 7 });
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      ts: { $lte: new Date('2026-03-26T00:00:00.000Z') },
      type: 'pageview',
    });
  });
});
