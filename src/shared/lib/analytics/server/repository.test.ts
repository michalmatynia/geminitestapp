import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, getRedisConnectionMock, captureExceptionMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('analytics repository', () => {
  beforeEach(() => {
    vi.resetModules();
    getMongoDbMock.mockReset();
    getRedisConnectionMock.mockReset();
    captureExceptionMock.mockReset();
    process.env['ANALYTICS_IP_MODE'] = 'masked';
    process.env['ANALYTICS_IP_SALT'] = 'salt';
  });

  it('inserts analytics events and bumps the cache version', async () => {
    const createIndex = vi.fn().mockResolvedValue('ok');
    const insertOne = vi.fn().mockResolvedValue({
      insertedId: { toString: () => 'analytics-event-1' },
    });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({ createIndex, insertOne }),
    });
    getRedisConnectionMock.mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      incr: vi.fn().mockResolvedValue(1),
      set: vi.fn().mockResolvedValue('OK'),
    });

    const { insertAnalyticsEvent } = await import('./repository');

    await expect(
      insertAnalyticsEvent(
        {
          type: 'pageview',
          scope: 'public',
          path: '/kangur',
          visitorId: 'visitor-1',
          sessionId: 'session-1',
          search: ' ?utm_source=google ',
          url: ' https://kangur.example/kangur ',
          title: ' Kangur ',
          referrer: ' https://google.com ',
          referrerHost: ' google.com ',
          language: ' en ',
          timeZone: ' Europe/Warsaw ',
          clientTs: '2026-03-22T10:00:00.000Z',
          ua: { browser: 'Chrome', os: 'macOS', device: 'desktop', isBot: false },
        },
        {
          ip: '192.168.10.45',
          userAgent: 'Mozilla/5.0',
          country: 'PL',
          region: 'Mazowieckie',
          city: 'Warsaw',
        }
      )
    ).resolves.toEqual({ id: 'analytics-event-1' });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/kangur',
        search: '?utm_source=google',
        url: 'https://kangur.example/kangur',
        title: 'Kangur',
        referrer: 'https://google.com',
        referrerHost: 'google.com',
        language: 'en',
        timeZone: 'Europe/Warsaw',
        ipMasked: '192.168.10.0',
        ipHash: expect.any(String),
        userAgent: 'Mozilla/5.0',
        country: 'PL',
        region: 'Mazowieckie',
        city: 'Warsaw',
      })
    );
  });

  it('clears analytics events using the provided filters', async () => {
    const createIndex = vi.fn().mockResolvedValue('ok');
    const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 7 });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({ createIndex, deleteMany }),
    });
    getRedisConnectionMock.mockReturnValue(null);

    const { clearAnalyticsEvents } = await import('./repository');

    await expect(
      clearAnalyticsEvents({
        before: new Date('2026-03-22T10:00:00.000Z'),
        type: 'pageview',
      })
    ).resolves.toEqual({ deleted: 7 });

    expect(deleteMany).toHaveBeenCalledWith({
      ts: { $lte: new Date('2026-03-22T10:00:00.000Z') },
      type: 'pageview',
    });
  });
});
