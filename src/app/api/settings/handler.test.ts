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
  createIndexMock: vi.fn(),
  findOneMock: vi.fn(),
  updateOneMock: vi.fn(),
  primeFrontPageSettingRuntimeMock: vi.fn(),
  invalidateAppDbProviderCacheMock: vi.fn(),
  invalidateCollectionProviderMapCacheMock: vi.fn(),
  invalidateDatabaseEnginePolicyCacheMock: vi.fn(),
  invalidateFileStorageSettingsCacheMock: vi.fn(),
  logSystemEventMock: vi.fn(),
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
  isServerLoggingEnabled: vi.fn(async () => true),
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

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEventMock,
}));

vi.mock('@/app/(frontend)/home-helpers', () => ({
  primeFrontPageSettingRuntime: mocks.primeFrontPageSettingRuntimeMock,
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
    mocks.createIndexMock.mockResolvedValue('settings_key');
    mocks.findOneMock.mockResolvedValue(null);
    mocks.updateOneMock.mockResolvedValue({ acknowledged: true });
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        createIndex: mocks.createIndexMock,
        findOne: mocks.findOneMock,
        updateOne: mocks.updateOneMock,
      })),
    });
    mocks.logSystemEventMock.mockResolvedValue(undefined);
    mocks.primeFrontPageSettingRuntimeMock.mockReturnValue(null);
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

  it('canonicalizes the front page setting before saving it', async () => {
    mocks.findOneMock.mockResolvedValue({
      key: 'front_page_app',
      value: 'cms',
    });
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'front_page_app',
        value: ' StudiQ ',
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'front_page_app',
          value: ' StudiQ ',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { key: 'front_page_app' },
      expect.objectContaining({
        $set: expect.objectContaining({ value: 'kangur' }),
      }),
      { upsert: true }
    );
    await expect(response.json()).resolves.toEqual({
      key: 'front_page_app',
      value: 'kangur',
    });
    expect(mocks.primeFrontPageSettingRuntimeMock).toHaveBeenCalledWith('kangur');
    expect(mocks.logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Front page app restored to Kangur.',
        context: expect.objectContaining({
          previousValue: 'cms',
          nextValue: 'kangur',
          previousPublicOwner: 'cms',
          nextPublicOwner: 'kangur',
        }),
      })
    );
  });

  it('rejects unsupported front page setting values', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'front_page_app',
        value: 'unexpected-app',
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'front_page_app',
          value: 'unexpected-app',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(400);
    expect(mocks.findOneMock).not.toHaveBeenCalled();
    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    expect(mocks.primeFrontPageSettingRuntimeMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'front_page_app must be one of: cms, kangur, chatbot, notes.',
    });
    expect(mocks.logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Rejected invalid front page app update.',
        context: expect.objectContaining({
          key: 'front_page_app',
          attemptedValue: 'unexpected-app',
        }),
      })
    );
  });

  it('logs a warning when the front page app switches away from Kangur', async () => {
    mocks.findOneMock.mockResolvedValue({
      key: 'front_page_app',
      value: 'kangur',
    });
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'front_page_app',
        value: 'cms',
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'front_page_app',
          value: 'cms',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      key: 'front_page_app',
      value: 'cms',
    });
    expect(mocks.primeFrontPageSettingRuntimeMock).toHaveBeenCalledWith('cms');
    expect(mocks.logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Front page app switched away from Kangur.',
        context: expect.objectContaining({
          previousValue: 'kangur',
          nextValue: 'cms',
          previousPublicOwner: 'kangur',
          nextPublicOwner: 'cms',
        }),
      })
    );
  });
});
