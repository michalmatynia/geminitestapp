import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, reportRuntimeCatchMock, applyActiveMongoSourceEnvMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  reportRuntimeCatchMock: vi.fn(),
  applyActiveMongoSourceEnvMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  applyActiveMongoSourceEnv: applyActiveMongoSourceEnvMock,
}));

vi.mock('@/shared/utils/observability/runtime-error-reporting', () => ({
  reportRuntimeCatch: reportRuntimeCatchMock,
}));

import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  DEFAULT_DATABASE_ENGINE_POLICY,
} from './database-engine-constants';
import {
  getDatabaseEngineBackupSchedule,
  getDatabaseEngineCollectionRouteMap,
  getDatabaseEngineOperationControls,
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  getDatabaseEngineServiceRouteMap,
  invalidateDatabaseEnginePolicyCache,
  isPrimaryProviderConfigured,
  isRedisProviderConfigured,
} from './database-engine-policy';

const originalMongoUri = process.env['MONGODB_URI'];
const originalRedisUrl = process.env['REDIS_URL'];

const createMongoMock = (values: Record<string, string | null | undefined>) => {
  const findOneMock = vi.fn(async (query: { $or?: Array<{ _id?: string; key?: string }> }) => {
    const key = query.$or?.[0]?._id ?? query.$or?.[1]?.key ?? '';
    const value = values[key];
    return value == null ? null : { _id: key, value };
  });

  return {
    findOneMock,
    mongo: {
      collection: vi.fn(() => ({
        findOne: findOneMock,
      })),
    },
  };
};

describe('database-engine-policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDatabaseEnginePolicyCache();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
    delete process.env['REDIS_URL'];
  });

  afterEach(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }

    if (originalRedisUrl === undefined) {
      delete process.env['REDIS_URL'];
    } else {
      process.env['REDIS_URL'] = originalRedisUrl;
    }
  });

  it('reads and caches policy settings from mongo', async () => {
    const { findOneMock, mongo } = createMongoMock({
      [DATABASE_ENGINE_POLICY_KEY]: JSON.stringify({
        requireExplicitServiceRouting: true,
        strictProviderAvailability: true,
      }),
      [DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY]: JSON.stringify({
        app: 'mongodb',
        auth: 'redis',
        invalid: 'sqlite',
      }),
      [DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY]: JSON.stringify({
        users: 'mongodb',
        cache: 'redis',
        ignored: 'sqlite',
      }),
      [DATABASE_ENGINE_BACKUP_SCHEDULE_KEY]: JSON.stringify({
        schedulerEnabled: true,
        mongodb: { enabled: true, cadence: 'weekly', weekday: 5, timeUtc: '04:30' },
      }),
      [DATABASE_ENGINE_OPERATION_CONTROLS_KEY]: JSON.stringify({
        allowManualFullSync: false,
        allowBackupSchedulerTick: false,
      }),
    });
    getMongoDbMock.mockResolvedValue(mongo);

    await expect(getDatabaseEnginePolicy()).resolves.toEqual({
      ...DEFAULT_DATABASE_ENGINE_POLICY,
      requireExplicitServiceRouting: true,
      strictProviderAvailability: true,
    });
    await expect(getDatabaseEngineServiceRouteMap()).resolves.toEqual({
      app: 'mongodb',
      auth: 'redis',
    });
    await expect(getDatabaseEngineCollectionRouteMap()).resolves.toEqual({
      users: 'mongodb',
      cache: 'redis',
    });
    await expect(getDatabaseEngineBackupSchedule()).resolves.toEqual({
      ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
      schedulerEnabled: true,
      mongodb: {
        ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.mongodb,
        enabled: true,
        cadence: 'weekly',
        weekday: 5,
        timeUtc: '04:30',
      },
    });
    await expect(getDatabaseEngineOperationControls()).resolves.toEqual({
      ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
      allowManualFullSync: false,
      allowBackupSchedulerTick: false,
    });
    await expect(getDatabaseEngineServiceProvider('app')).resolves.toBe('mongodb');
    await expect(getDatabaseEngineServiceProvider('product')).resolves.toBeNull();

    await getDatabaseEnginePolicy();
    await getDatabaseEngineServiceRouteMap();
    await getDatabaseEngineCollectionRouteMap();
    await getDatabaseEngineBackupSchedule();
    await getDatabaseEngineOperationControls();

    expect(findOneMock).toHaveBeenCalledTimes(5);
  });

  it('falls back to defaults for invalid stored JSON and reports parse failures', async () => {
    const { mongo } = createMongoMock({
      [DATABASE_ENGINE_POLICY_KEY]: '{',
      [DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY]: '{',
      [DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY]: '{',
      [DATABASE_ENGINE_BACKUP_SCHEDULE_KEY]: '{',
      [DATABASE_ENGINE_OPERATION_CONTROLS_KEY]: '{',
    });
    getMongoDbMock.mockResolvedValue(mongo);

    await expect(getDatabaseEnginePolicy()).resolves.toEqual(DEFAULT_DATABASE_ENGINE_POLICY);
    await expect(getDatabaseEngineServiceRouteMap()).resolves.toEqual({});
    await expect(getDatabaseEngineCollectionRouteMap()).resolves.toEqual({});
    await expect(getDatabaseEngineBackupSchedule()).resolves.toEqual(
      DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
    );
    await expect(getDatabaseEngineOperationControls()).resolves.toEqual(
      DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
    );

    expect(reportRuntimeCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'db.database-engine-policy',
        action: 'parseJsonObject',
      })
    );
  });

  it('returns defaults when mongo reads fail or are unavailable and exposes provider helpers', async () => {
    getMongoDbMock.mockRejectedValue(new Error('settings unavailable'));

    await expect(getDatabaseEnginePolicy()).resolves.toEqual(DEFAULT_DATABASE_ENGINE_POLICY);
    expect(reportRuntimeCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'db.database-engine-policy',
        action: 'readMongoSetting',
      })
    );

    invalidateDatabaseEnginePolicyCache();
    vi.clearAllMocks();
    delete process.env['MONGODB_URI'];

    await expect(getDatabaseEngineServiceRouteMap()).resolves.toEqual({});
    expect(getMongoDbMock).not.toHaveBeenCalled();
    expect(isPrimaryProviderConfigured('mongodb')).toBe(false);
    expect(isRedisProviderConfigured()).toBe(false);

    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/app';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    expect(isPrimaryProviderConfigured('mongodb')).toBe(true);
    expect(isRedisProviderConfigured()).toBe(true);
  });
});
