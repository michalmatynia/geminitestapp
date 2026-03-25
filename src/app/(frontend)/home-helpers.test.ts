import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, captureExceptionMock, getUserPreferencesMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  getUserPreferencesMock: vi.fn(),
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

describe('home-helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock('react');
    vi.unmock('@/app/(frontend)/home-helpers');
    vi.clearAllMocks();
    vi.useRealTimers();
    delete process.env['MONGODB_URI'];
  });

  it('returns null without touching mongo when no mongo uri is configured', async () => {
    const { getFrontPageSetting } = await import('@/app/(frontend)/home-helpers');

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

    const { getFrontPageSetting } = await import('@/app/(frontend)/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBeNull();
    await expect(getFrontPageSetting()).resolves.toBeNull();

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).not.toHaveBeenCalled();

    vi.setSystemTime(new Date('2026-03-23T12:00:31.000Z'));

    await expect(getFrontPageSetting()).resolves.toBeNull();
    expect(getMongoDbMock).toHaveBeenCalledTimes(2);
  });

  it('still captures unexpected mongo read failures', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const error = new Error('settings collection schema mismatch');
    getMongoDbMock.mockRejectedValue(error);

    const { getFrontPageSetting } = await import('@/app/(frontend)/home-helpers');

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

    const { getFrontPageSetting } = await import('@/app/(frontend)/home-helpers');

    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    await expect(getFrontPageSetting()).resolves.toBe('kangur');
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
      '@/app/(frontend)/home-helpers'
    );

    expect(primeFrontPageSettingRuntime('StudiQ')).toBe('kangur');
    await expect(getFrontPageSetting()).resolves.toBe('kangur');
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });
});
