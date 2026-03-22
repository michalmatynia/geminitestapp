import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalMongoUri = process.env['MONGODB_URI'];

const createMongoMock = (value: string | null | undefined) => {
  const findOneMock = vi.fn(async () =>
    value == null ? null : { _id: 'database_engine_collection_route_map_v1', value }
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
  const appDbProvider = await import('./app-db-provider');
  const databaseEnginePolicy = await import('./database-engine-policy');
  const errorSystem = await import('@/shared/utils/observability/error-system');
  const spies = {
    getMongoDb: vi.spyOn(mongoClient, 'getMongoDb'),
    getAppDbProvider: vi.spyOn(appDbProvider, 'getAppDbProvider'),
    getDatabaseEnginePolicy: vi.spyOn(databaseEnginePolicy, 'getDatabaseEnginePolicy'),
    captureException: vi.spyOn(errorSystem.ErrorSystem, 'captureException'),
  };
  const collectionProviderMap = await import('./collection-provider-map');

  return {
    ...collectionProviderMap,
    spies,
  };
};

describe('collection-provider-map', () => {
  beforeEach(() => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('reads and caches the collection route map from mongo', async () => {
    const { getCollectionProviderMap, getCollectionRouteMap, invalidateCollectionProviderMapCache, spies } =
      await loadModule();
    const mongoFixture = createMongoMock(
      JSON.stringify({
        Users: 'mongodb',
        cache: 'redis',
        ignored: 'sqlite',
      })
    );
    spies.getMongoDb.mockResolvedValue(mongoFixture.mongo as never);
    invalidateCollectionProviderMapCache();

    await expect(getCollectionRouteMap()).resolves.toEqual({
      Users: 'mongodb',
      cache: 'redis',
    });
    await expect(getCollectionRouteMap()).resolves.toEqual({
      Users: 'mongodb',
      cache: 'redis',
    });
    await expect(getCollectionProviderMap()).resolves.toEqual({
      Users: 'mongodb',
    });

    expect(mongoFixture.findOneMock).toHaveBeenCalledTimes(1);
  });

  it('resolves explicit routes, rejects redis targets, and falls back to the app provider', async () => {
    const { getCollectionProvider, invalidateCollectionProviderMapCache, spies } = await loadModule();
    const mongoFixture = createMongoMock(
      JSON.stringify({
        Users: 'mongodb',
        cache: 'redis',
      })
    );
    spies.getMongoDb.mockResolvedValue(mongoFixture.mongo as never);
    spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitCollectionRouting: false,
    });
    spies.getAppDbProvider.mockResolvedValue('mongodb');
    invalidateCollectionProviderMapCache();

    await expect(getCollectionProvider(' users ')).resolves.toBe('mongodb');
    await expect(getCollectionProvider('cache')).rejects.toThrow(/requires mongodb/i);
    await expect(getCollectionProvider('orders')).resolves.toBe('mongodb');
    expect(spies.getAppDbProvider).toHaveBeenCalledTimes(1);
  });

  it('respects explicit routing requirements and request-level provider overrides', async () => {
    const { getCollectionProvider, invalidateCollectionProviderMapCache, resolveCollectionProviderForRequest, spies } =
      await loadModule();
    const mongoFixture = createMongoMock(JSON.stringify({}));
    spies.getMongoDb.mockResolvedValue(mongoFixture.mongo as never);
    spies.getDatabaseEnginePolicy.mockResolvedValue({
      requireExplicitCollectionRouting: true,
    });
    invalidateCollectionProviderMapCache();

    await expect(getCollectionProvider('orders')).rejects.toThrow(/explicit route/i);
    await expect(resolveCollectionProviderForRequest('orders', 'mongodb')).resolves.toBe(
      'mongodb'
    );
  });

  it('returns an empty map when mongo is unavailable or the route map is invalid', async () => {
    const unavailable = await loadModule();
    unavailable.spies.getMongoDb.mockRejectedValueOnce(new Error('mongo offline'));
    unavailable.invalidateCollectionProviderMapCache();

    await expect(unavailable.getCollectionRouteMap()).resolves.toEqual({});
    expect(unavailable.spies.captureException).toHaveBeenCalledWith(expect.any(Error));

    const invalid = await loadModule();
    invalid.spies.getMongoDb.mockResolvedValue(createMongoMock('{').mongo as never);
    invalid.invalidateCollectionProviderMapCache();

    await expect(invalid.getCollectionRouteMap()).resolves.toEqual({});
    expect(invalid.spies.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
