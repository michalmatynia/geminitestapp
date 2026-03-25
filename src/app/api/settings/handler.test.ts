import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  resetServerLoggingControlsCacheMock: vi.fn(),
  clearLiteSettingsServerCacheMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  invalidateAppDbProviderCacheMock: vi.fn(),
  invalidateCollectionProviderMapCacheMock: vi.fn(),
  invalidateDatabaseEnginePolicyCacheMock: vi.fn(),
  invalidateFileStorageSettingsCacheMock: vi.fn(),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: mocks.parseJsonBodyMock,
}));

vi.mock('@/shared/lib/settings-cache', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/settings-cache')>(
    '@/shared/lib/settings-cache'
  );
  return {
    ...actual,
    clearSettingsCache: mocks.clearSettingsCacheMock,
    getCachedSettings: vi.fn(),
    setCachedSettings: vi.fn(),
    getSettingsCacheStats: vi.fn(),
    isSettingsCacheDebugEnabled: vi.fn(() => false),
    getSettingsInflight: vi.fn(),
    setSettingsInflight: vi.fn(),
    getStaleSettings: vi.fn(),
    getLastKnownSettings: vi.fn(),
  };
});

vi.mock('@/shared/lib/observability/logging-controls-server', () => ({
  resetServerLoggingControlsCache: mocks.resetServerLoggingControlsCacheMock,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  clearLiteSettingsServerCache: mocks.clearLiteSettingsServerCacheMock,
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
  getAppDbProvider: mocks.getAppDbProviderMock,
  invalidateAppDbProviderCache: mocks.invalidateAppDbProviderCacheMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDbMock,
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  invalidateCollectionProviderMapCache: mocks.invalidateCollectionProviderMapCacheMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  invalidateDatabaseEnginePolicyCache: mocks.invalidateDatabaseEnginePolicyCacheMock,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  invalidateFileStorageSettingsCache: mocks.invalidateFileStorageSettingsCacheMock,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  upsertAiPathsSetting: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/kangur/services/kangur-settings-repository')>(
      '@/features/kangur/services/kangur-settings-repository'
    );
  return {
    ...actual,
    isKangurSettingKey: vi.fn(() => false),
    listKangurSettings: vi.fn(async () => []),
    readKangurSettingValue: vi.fn(async () => null),
    upsertKangurSettingValue: vi.fn(async () => null),
  };
});

import { POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-settings-post-1',
    traceId: 'trace-settings-post-1',
    correlationId: 'corr-settings-post-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query: {},
  }) as ApiHandlerContext;

describe('settings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    mocks.assertSettingsManageAccessMock.mockResolvedValue(undefined);
    mocks.getAppDbProviderMock.mockResolvedValue('mongodb');
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
      })),
    });
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
        value: 'true',
      },
    });
  });

  it('clears settings caches, resets logging-control cache, and clears lite cache for lite keys', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
          value: 'true',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(mocks.clearSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.resetServerLoggingControlsCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.clearLiteSettingsServerCacheMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
      value: 'true',
    });
  });
});
