import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  captureExceptionMock,
  getUserPreferencesMock,
  getLiteSettingsForHydrationMock,
  readFrontPageDevSnapshotMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  getUserPreferencesMock: vi.fn(),
  getLiteSettingsForHydrationMock: vi.fn(),
  readFrontPageDevSnapshotMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

vi.mock('@/features/auth/server', () => ({
  getUserPreferences: getUserPreferencesMock,
}));

vi.mock('@/shared/lib/lite-settings-ssr', () => ({
  getLiteSettingsForHydration: getLiteSettingsForHydrationMock,
}));

vi.mock('@/shared/lib/front-page-dev-snapshot', () => ({
  readFrontPageDevSnapshot: readFrontPageDevSnapshotMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

describe('home-helpers', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    vi.resetModules();
    vi.unmock('react');
    vi.unmock('@/app/(frontend)/home/home-helpers');
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env['NODE_ENV'] = 'test';
    delete process.env['MONGODB_URI'];
    delete process.env['ENABLE_DEV_FRONT_PAGE_SETTING_LOOKUP'];
    getLiteSettingsForHydrationMock.mockResolvedValue([]);
    readFrontPageDevSnapshotMock.mockResolvedValue(null);
    logSystemEventMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
      return;
    }

    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('returns null without touching mongo when no mongo uri is configured', async () => {
    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBeNull();
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('reads mongo front page settings in development by default', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        findOne: vi.fn().mockResolvedValue({ value: 'StudiQ' }),
      })),
    });

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
  });

  it('can skip mongo front page reads in development when explicitly disabled', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    process.env['ENABLE_DEV_FRONT_PAGE_SETTING_LOOKUP'] = 'false';

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBeNull();
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('silently suppresses transient mongo connectivity failures and retries after a cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';

    const error = new Error('connection 10 to 104.40.250.190:27017 timed out');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBeNull();
    await expect(getFrontPageSetting()).resolves.toBeNull();

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(31_000);

    await expect(getFrontPageSetting()).resolves.toBeNull();
    expect(getMongoDbMock).toHaveBeenCalledTimes(2);
  });

  it('still captures unexpected mongo read failures', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const error = new Error('settings collection schema mismatch');
    getMongoDbMock.mockRejectedValue(error);

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBeNull();
    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      service: 'frontend.home-helpers',
      source: 'frontend.home-helpers',
      action: 'readMongoFrontPageSetting',
      settingKey: 'front_page_app',
    });
  });

  it('keeps the last resolved front page app during transient mongo outages', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';

    const findOneMock = vi
      .fn()
      .mockResolvedValueOnce({ value: ' StudiQ ' })
      .mockRejectedValueOnce(new Error('connection 10 to 104.40.250.190:27017 timed out'));

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        findOne: findOneMock,
      })),
    });

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
      };
    });

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    vi.advanceTimersByTime(31_000);
    await expect(getFrontPageSetting()).resolves.toBe('kangur');

    expect(getMongoDbMock).toHaveBeenCalledTimes(2);
  });

  it('returns the primed front page setting immediately when mongo is unavailable', async () => {
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
      };
    });

    const { getFrontPageSetting, primeFrontPageSettingRuntime } = await import(
      '@/app/(frontend)/home/home-helpers'
    );

    expect(primeFrontPageSettingRuntime('StudiQ')).toBe('kangur');
    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('reuses the development snapshot immediately on cold start before touching mongo', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    readFrontPageDevSnapshotMock.mockResolvedValue('kangur');

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('reuses the bootstrapped lite front page setting when mongo is unavailable', async () => {
    getLiteSettingsForHydrationMock.mockResolvedValue([
      {
        key: 'front_page_app',
        value: 'StudiQ',
      },
    ]);

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('reports lite bootstrap as the front page selection source when reused', async () => {
    getLiteSettingsForHydrationMock.mockResolvedValue([
      {
        key: 'front_page_app',
        value: 'StudiQ',
      },
    ]);

    const { resolveFrontPageSelection } = await import('@/app/(frontend)/home/home-helpers');

    await expect(resolveFrontPageSelection()).resolves.toMatchObject({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'lite',
      fallbackReason: null,
    });
  });

  it('reuses the development snapshot on cold start before touching a slow mongo path', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const error = new Error('connection 10 to 104.40.250.190:27017 timed out');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);
    readFrontPageDevSnapshotMock.mockResolvedValue('kangur');

    const { resolveFrontPageSelection } = await import('@/app/(frontend)/home/home-helpers');

    await expect(resolveFrontPageSelection()).resolves.toMatchObject({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      source: 'dev-snapshot',
      fallbackReason: null,
    });
    expect(getMongoDbMock).not.toHaveBeenCalled();
    expect(logSystemEventMock).not.toHaveBeenCalled();
  });

  it('keeps the last resolved front page setting on the fast path in development after the cache ttl', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00.000Z'));
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        findOne: vi.fn().mockResolvedValue({ value: 'StudiQ' }),
      })),
    });

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
      };
    });

    const { getFrontPageSetting } = await import('@/app/(frontend)/home/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-03-23T12:00:31.000Z'));

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
  });
});
