import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalAppDbProvider = process.env['APP_DB_PROVIDER'];
const originalMongoUri = process.env['MONGODB_URI'];

const createMongoMock = (value: string | null | undefined) => {
  const findOneMock = vi.fn(async () =>
    value == null ? null : { _id: 'app_db_provider', value }
  );
  return {
    findOneMock,
    mongo: {
      collection: vi.fn(() => ({
        findOne: findOneMock,
      })),
    },
  };
};

const loadModule = async () => {
  vi.resetModules();

  const mongoClient = await import('@/shared/lib/db/mongo-client');
  const databaseEnginePolicy = await import('./database-engine-policy');
  const runtimeErrorReporting = await import('@/shared/utils/observability/runtime-error-reporting');
  const spies = {
    getMongoDb: vi.spyOn(mongoClient, 'getMongoDb'),
    getDatabaseEnginePolicy: vi.spyOn(databaseEnginePolicy, 'getDatabaseEnginePolicy'),
    getDatabaseEngineServiceProvider: vi.spyOn(
      databaseEnginePolicy,
      'getDatabaseEngineServiceProvider'
    ),
    isPrimaryProviderConfigured: vi.spyOn(
      databaseEnginePolicy,
      'isPrimaryProviderConfigured'
    ),
    reportRuntimeCatch: vi.spyOn(runtimeErrorReporting, 'reportRuntimeCatch'),
  };
  const appDbProvider = await import('./app-db-provider');

  return {
    ...appDbProvider,
    spies,
  };
};

describe('app-db-provider', () => {
  beforeEach(() => {
    delete process.env['APP_DB_PROVIDER'];
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalAppDbProvider === undefined) {
      delete process.env['APP_DB_PROVIDER'];
    } else {
      process.env['APP_DB_PROVIDER'] = originalAppDbProvider;
    }

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('prefers and caches the env setting before reading mongo', async () => {
    const { getAppDbProviderSetting, invalidateAppDbProviderCache, spies } = await loadModule();
    invalidateAppDbProviderCache();
    process.env['APP_DB_PROVIDER'] = 'mongodb';

    await expect(getAppDbProviderSetting()).resolves.toBe('mongodb');
    await expect(getAppDbProviderSetting()).resolves.toBe('mongodb');

    expect(spies.getMongoDb).not.toHaveBeenCalled();
  });

  it('reads the provider setting from mongo and reports mongo read failures', async () => {
    process.env['APP_DB_PROVIDER'] = 'redis';
    const { getAppDbProviderSetting, invalidateAppDbProviderCache, spies } = await loadModule();
    const mongoFixture = createMongoMock('mongodb');
    spies.getMongoDb.mockResolvedValue(mongoFixture.mongo as never);
    invalidateAppDbProviderCache();

    await expect(getAppDbProviderSetting()).resolves.toBe('mongodb');
    await expect(getAppDbProviderSetting()).resolves.toBe('mongodb');
    expect(mongoFixture.findOneMock).toHaveBeenCalledTimes(1);

    spies.getMongoDb.mockRejectedValueOnce(new Error('settings failed'));
    invalidateAppDbProviderCache();

    await expect(getAppDbProviderSetting()).resolves.toBeNull();
    expect(spies.reportRuntimeCatch).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'db.app-db-provider',
        action: 'readMongoAppProviderSetting',
      })
    );
  });

  it('uses and caches explicit service routing when supported', async () => {
    const { getAppDbProvider, invalidateAppDbProviderCache, spies } = await loadModule();
    spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    spies.getDatabaseEngineServiceProvider.mockResolvedValue('mongodb');
    spies.isPrimaryProviderConfigured.mockReturnValue(true);
    invalidateAppDbProviderCache();

    await expect(getAppDbProvider()).resolves.toBe('mongodb');
    await expect(getAppDbProvider()).resolves.toBe('mongodb');

    expect(spies.getDatabaseEnginePolicy).toHaveBeenCalledTimes(1);
    expect(spies.getDatabaseEngineServiceProvider).toHaveBeenCalledTimes(1);
  });

  it('falls back to the app-wide setting when explicit service routing is absent', async () => {
    const { getAppDbProvider, invalidateAppDbProviderCache, spies } = await loadModule();
    spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    spies.getDatabaseEngineServiceProvider.mockResolvedValue(null);
    process.env['APP_DB_PROVIDER'] = 'mongodb';
    invalidateAppDbProviderCache();

    await expect(getAppDbProvider()).resolves.toBe('mongodb');
  });

  it('rejects unsupported or unconfigured routing states', async () => {
    const redisRoute = await loadModule();
    redisRoute.spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    redisRoute.spies.getDatabaseEngineServiceProvider.mockResolvedValue('redis');
    redisRoute.invalidateAppDbProviderCache();
    await expect(redisRoute.getAppDbProvider()).rejects.toThrow(/cannot target redis/i);

    const unconfiguredRoute = await loadModule();
    unconfiguredRoute.spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    unconfiguredRoute.spies.getDatabaseEngineServiceProvider.mockResolvedValue('mongodb');
    unconfiguredRoute.spies.isPrimaryProviderConfigured.mockReturnValue(false);
    unconfiguredRoute.invalidateAppDbProviderCache();
    await expect(unconfiguredRoute.getAppDbProvider()).rejects.toThrow(/not configured/i);

    const explicitRouting = await loadModule();
    explicitRouting.spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: true,
    });
    explicitRouting.spies.getDatabaseEngineServiceProvider.mockResolvedValue(null);
    explicitRouting.invalidateAppDbProviderCache();
    await expect(explicitRouting.getAppDbProvider()).rejects.toThrow(
      /requires explicit service routing/i
    );

    delete process.env['MONGODB_URI'];
    const missingProvider = await loadModule();
    missingProvider.spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    missingProvider.spies.getDatabaseEngineServiceProvider.mockResolvedValue(null);
    missingProvider.invalidateAppDbProviderCache();
    await expect(missingProvider.getAppDbProvider()).rejects.toThrow(
      /no database provider is configured/i
    );
  });
});
