import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_LAUNCH_ROUTE_SETTINGS_KEY } from '@/shared/contracts/kangur-settings-keys';
import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { KANGUR_SLOT_ASSIGNMENTS_KEY, KANGUR_THEME_CATALOG_KEY } from '@/shared/contracts/kangur';
import { AI_BRAIN_SETTINGS_KEY } from '@/shared/lib/ai-brain/settings';
import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  resetServerLoggingControlsCacheMock: vi.fn(),
  clearLiteSettingsServerCacheMock: vi.fn(),
  invalidateBrainSettingsCacheMock: vi.fn(),
  upsertBrainRoutingSettingsMock: vi.fn(),
  invalidateKangurStorefrontInitialStateCacheMock: vi.fn(),
  isKangurStorefrontInitialStateDependencyKeyMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  createIndexMock: vi.fn(),
  findOneMock: vi.fn(),
  findMock: vi.fn(),
  toArrayMock: vi.fn(),
  deleteManyMock: vi.fn(),
  updateOneMock: vi.fn(),
  listAdminMenuSettingsFromLocalAppDbMock: vi.fn(),
  readAdminMenuSettingFromLocalAppDbMock: vi.fn(),
  upsertAdminMenuSettingInLocalAppDbMock: vi.fn(),
  primeFrontPageSettingRuntimeMock: vi.fn(),
  primeKangurLaunchRouteRuntimeMock: vi.fn(),
  writeKangurLaunchRouteDevSnapshotMock: vi.fn(),
  writeFrontPageDevSnapshotMock: vi.fn(),
  invalidateAppDbProviderCacheMock: vi.fn(),
  invalidateCollectionProviderMapCacheMock: vi.fn(),
  invalidateDatabaseEnginePolicyCacheMock: vi.fn(),
  invalidateFileStorageSettingsCacheMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  ensureKangurStorefrontAppearanceSettingsSeededMock: vi.fn(),
  ensureKangurThemePresetManifestSeededMock: vi.fn(),
  ensureKangurThemeCatalogSeededMock: vi.fn(),
  ensureKangurThemeSlotAssignmentsSeededMock: vi.fn(),
  readKangurSettingValueMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
  upsertSecretSettingValueMock: vi.fn(),
  deleteSecretSettingValuesMock: vi.fn(),
  isKangurSettingKeyMock: vi.fn(),
  listKangurSettingsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
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

vi.mock('@/shared/lib/ai-brain/server', () => ({
  invalidateBrainSettingsCache: mocks.invalidateBrainSettingsCacheMock,
  upsertBrainRoutingSettings: mocks.upsertBrainRoutingSettingsMock,
}));

vi.mock('@/features/kangur/appearance/server/storefront-appearance', () => ({
  invalidateKangurStorefrontInitialStateCache:
    mocks.invalidateKangurStorefrontInitialStateCacheMock,
  isKangurStorefrontInitialStateDependencyKey:
    mocks.isKangurStorefrontInitialStateDependencyKeyMock,
}));

vi.mock('@/features/kangur/appearance/server/storefront-appearance-source', () => ({
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS: [
    'kangur_storefront_default_mode_v1',
    'kangur_cms_theme_daily_v1',
    'kangur_cms_theme_dawn_v1',
    'kangur_cms_theme_sunset_v1',
    'kangur_cms_theme_nightly_v1',
  ],
  ensureKangurStorefrontAppearanceSettingsSeeded:
    mocks.ensureKangurStorefrontAppearanceSettingsSeededMock,
}));

vi.mock('@/features/kangur/appearance/server/theme-preset-manifest-source', () => ({
  ensureKangurThemePresetManifestSeeded: mocks.ensureKangurThemePresetManifestSeededMock,
}));

vi.mock('@/features/kangur/appearance/server/theme-catalog-source', () => ({
  ensureKangurThemeCatalogSeeded: mocks.ensureKangurThemeCatalogSeededMock,
}));

vi.mock('@/features/kangur/appearance/server/theme-slot-assignments-source', () => ({
  ensureKangurThemeSlotAssignmentsSeeded: mocks.ensureKangurThemeSlotAssignmentsSeededMock,
}));

vi.mock('@/features/kangur/server', () => ({
  invalidateKangurStorefrontInitialStateCache:
    mocks.invalidateKangurStorefrontInitialStateCacheMock,
  isKangurStorefrontInitialStateDependencyKey:
    mocks.isKangurStorefrontInitialStateDependencyKeyMock,
  primeKangurLaunchRouteRuntime: mocks.primeKangurLaunchRouteRuntimeMock,
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS: [
    'kangur_storefront_default_mode_v1',
    'kangur_cms_theme_daily_v1',
    'kangur_cms_theme_dawn_v1',
    'kangur_cms_theme_sunset_v1',
    'kangur_cms_theme_nightly_v1',
  ],
  ensureKangurStorefrontAppearanceSettingsSeeded:
    mocks.ensureKangurStorefrontAppearanceSettingsSeededMock,
  ensureKangurThemeCatalogSeeded: mocks.ensureKangurThemeCatalogSeededMock,
  ensureKangurThemePresetManifestSeeded: mocks.ensureKangurThemePresetManifestSeededMock,
  ensureKangurThemeSlotAssignmentsSeeded: mocks.ensureKangurThemeSlotAssignmentsSeededMock,
  isKangurSettingKey: mocks.isKangurSettingKeyMock,
  listKangurSettings: mocks.listKangurSettingsMock,
  readKangurSettingValue: mocks.readKangurSettingValueMock,
  upsertKangurSettingValue: mocks.upsertKangurSettingValueMock,
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
  getAppDbProvider: mocks.getAppDbProviderMock,
  invalidateAppDbProviderCache: mocks.invalidateAppDbProviderCacheMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDbMock,
}));

vi.mock('@/features/admin/server/admin-menu-settings-store', () => {
  const adminMenuKeys = [
    'admin_menu_favorites',
    'admin_menu_section_colors',
    'admin_menu_custom_enabled',
    'admin_menu_custom_nav',
  ] as const;
  const adminMenuKeySet = new Set<string>(adminMenuKeys);
  return {
    ADMIN_MENU_SETTING_KEYS: adminMenuKeys,
    isAdminMenuSettingKey: (key: string) => adminMenuKeySet.has(key),
    listAdminMenuSettingsFromLocalAppDb: mocks.listAdminMenuSettingsFromLocalAppDbMock,
    readAdminMenuSettingFromLocalAppDb: mocks.readAdminMenuSettingFromLocalAppDbMock,
    upsertAdminMenuSettingInLocalAppDb: mocks.upsertAdminMenuSettingInLocalAppDbMock,
  };
});

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

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePathMock,
}));

vi.mock('@/shared/lib/front-page-selection-runtime', () => ({
  primeFrontPageSettingRuntime: mocks.primeFrontPageSettingRuntimeMock,
}));

vi.mock('@/features/kangur/server/launch-route', () => ({
  primeKangurLaunchRouteRuntime: mocks.primeKangurLaunchRouteRuntimeMock,
}));

vi.mock('@/features/kangur/server/launch-route-dev-snapshot', () => ({
  writeKangurLaunchRouteDevSnapshot: mocks.writeKangurLaunchRouteDevSnapshotMock,
}));

vi.mock('@/shared/lib/front-page-dev-snapshot', () => ({
  writeFrontPageDevSnapshot: mocks.writeFrontPageDevSnapshotMock,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  upsertAiPathsSetting: vi.fn(),
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  upsertSecretSettingValue: mocks.upsertSecretSettingValueMock,
  deleteSecretSettingValues: mocks.deleteSecretSettingValuesMock,
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/kangur/services/kangur-settings-repository')>(
      '@/features/kangur/services/kangur-settings-repository'
    );
  return {
    ...actual,
    isKangurSettingKey: mocks.isKangurSettingKeyMock,
    listKangurSettings: mocks.listKangurSettingsMock,
    readKangurSettingValue: mocks.readKangurSettingValueMock,
    upsertKangurSettingValue: mocks.upsertKangurSettingValueMock,
  };
});

import { getHandler, postHandler } from '@/shared/server/api/settings/handler';

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
    mocks.toArrayMock.mockResolvedValue([]);
    mocks.deleteManyMock.mockResolvedValue({ deletedCount: 1 });
    mocks.findMock.mockReturnValue({ toArray: mocks.toArrayMock });
    mocks.updateOneMock.mockResolvedValue({ acknowledged: true });
    mocks.listAdminMenuSettingsFromLocalAppDbMock.mockResolvedValue([]);
    mocks.readAdminMenuSettingFromLocalAppDbMock.mockResolvedValue(null);
    mocks.upsertAdminMenuSettingInLocalAppDbMock.mockImplementation(
      async (key: string, value: string) => ({ key, value })
    );
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        createIndex: mocks.createIndexMock,
        find: mocks.findMock,
        findOne: mocks.findOneMock,
        deleteMany: mocks.deleteManyMock,
        updateOne: mocks.updateOneMock,
      })),
    });
    mocks.logSystemEventMock.mockResolvedValue(undefined);
    mocks.revalidatePathMock.mockReset();
    mocks.primeFrontPageSettingRuntimeMock.mockReturnValue(null);
    mocks.primeKangurLaunchRouteRuntimeMock.mockReturnValue('web_mobile_view');
    mocks.writeKangurLaunchRouteDevSnapshotMock.mockResolvedValue('web_mobile_view');
    mocks.writeFrontPageDevSnapshotMock.mockResolvedValue(null);
    mocks.isKangurStorefrontInitialStateDependencyKeyMock.mockReturnValue(false);
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
        value: 'true',
      },
    });
    mocks.ensureKangurStorefrontAppearanceSettingsSeededMock.mockResolvedValue([]);
    mocks.ensureKangurThemePresetManifestSeededMock.mockResolvedValue(null);
    mocks.ensureKangurThemeCatalogSeededMock.mockResolvedValue({
      key: KANGUR_THEME_CATALOG_KEY,
      value: '[]',
    });
    mocks.ensureKangurThemeSlotAssignmentsSeededMock.mockResolvedValue({
      key: KANGUR_SLOT_ASSIGNMENTS_KEY,
      value: '{}',
    });
    mocks.readKangurSettingValueMock.mockResolvedValue(null);
    mocks.upsertKangurSettingValueMock.mockImplementation(async (key: string, value: string) => ({
      key,
      value,
    }));
    mocks.upsertSecretSettingValueMock.mockResolvedValue(undefined);
    mocks.upsertBrainRoutingSettingsMock.mockResolvedValue(true);
    mocks.deleteSecretSettingValuesMock.mockResolvedValue(undefined);
    mocks.isKangurSettingKeyMock.mockReturnValue(false);
    mocks.listKangurSettingsMock.mockResolvedValue([]);
  });

  it('clears settings caches, resets logging-control cache, and clears lite cache for lite keys', async () => {
    const response = await postHandler(
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
    expect(mocks.invalidateKangurStorefrontInitialStateCacheMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
      value: 'true',
    });
  });

  it('persists the Tradera listing price currency setting', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode,
        value: 'EUR',
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode,
          value: 'EUR',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { key: TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode },
      expect.objectContaining({
        $set: expect.objectContaining({ value: 'EUR' }),
      }),
      { upsert: true }
    );
    await expect(response.json()).resolves.toEqual({
      key: TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode,
      value: 'EUR',
    });
  });

  it('pins admin menu favourites writes to the local geminitestapp app database', async () => {
    const value = JSON.stringify(['jobs/queue', 'page-manager/milkbardesigners']);
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'admin_menu_favorites',
        value,
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'admin_menu_favorites',
          value,
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertAdminMenuSettingInLocalAppDbMock).toHaveBeenCalledWith(
      'admin_menu_favorites',
      value
    );
    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      key: 'admin_menu_favorites',
      value,
    });
  });

  it('reads admin menu favourites from the local geminitestapp app database', async () => {
    const value = JSON.stringify(['jobs/queue']);
    mocks.readAdminMenuSettingFromLocalAppDbMock.mockResolvedValue(value);

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings?key=admin_menu_favorites'),
      {
        ...createContext(),
        query: { key: 'admin_menu_favorites' },
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.readAdminMenuSettingFromLocalAppDbMock).toHaveBeenCalledWith(
      'admin_menu_favorites'
    );
    expect(mocks.findOneMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      {
        key: 'admin_menu_favorites',
        value,
      },
    ]);
  });

  it('excludes active-source admin menu rows when listing settings', async () => {
    const localValue = JSON.stringify(['jobs/queue']);
    mocks.listAdminMenuSettingsFromLocalAppDbMock.mockResolvedValue([
      { key: 'admin_menu_favorites', value: localValue },
    ]);
    mocks.toArrayMock.mockResolvedValue([
      {
        _id: 'admin_menu_favorites',
        key: 'admin_menu_favorites',
        value: JSON.stringify(['stale-detached-copy']),
      },
      {
        _id: 'front_page_app',
        key: 'front_page_app',
        value: 'cms',
      },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings?fresh=1'),
      {
        ...createContext(),
        query: { fresh: true },
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toContainEqual({ key: 'admin_menu_favorites', value: localValue });
    expect(payload).toContainEqual({ key: 'front_page_app', value: 'cms' });
    expect(payload).not.toContainEqual({
      key: 'admin_menu_favorites',
      value: JSON.stringify(['stale-detached-copy']),
    });
  });

  it('invalidates the AI Brain runtime cache when AI Brain settings are saved', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: AI_BRAIN_SETTINGS_KEY,
        value: '{"defaults":{"enabled":true,"provider":"model","modelId":"","agentId":""}}',
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: AI_BRAIN_SETTINGS_KEY,
          value: '{"defaults":{"enabled":true,"provider":"model","modelId":"","agentId":""}}',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.invalidateBrainSettingsCacheMock).toHaveBeenCalledTimes(1);
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

    const response = await postHandler(
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
    expect(mocks.writeFrontPageDevSnapshotMock).toHaveBeenCalledWith('kangur');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/', 'layout');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/login');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/kangur/login');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/en');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/en/login');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/en/kangur/login');
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

    const response = await postHandler(
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

    const response = await postHandler(
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
    expect(mocks.writeFrontPageDevSnapshotMock).toHaveBeenCalledWith('cms');
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/', 'layout');
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

  it('invalidates the Kangur storefront snapshot cache for appearance setting writes', async () => {
    mocks.isKangurStorefrontInitialStateDependencyKeyMock.mockReturnValue(true);
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'kangur_storefront_default_mode_v1',
        value: 'sunset',
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'kangur_storefront_default_mode_v1',
          value: 'sunset',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.isKangurStorefrontInitialStateDependencyKeyMock).toHaveBeenCalledWith(
      'kangur_storefront_default_mode_v1'
    );
    expect(mocks.invalidateKangurStorefrontInitialStateCacheMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      key: 'kangur_storefront_default_mode_v1',
      value: 'sunset',
    });
  });

  it('primes the Kangur launch route runtime cache when the launch route setting changes', async () => {
    mocks.isKangurSettingKeyMock.mockReturnValue(true);
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
        value: JSON.stringify({ route: 'dedicated_app' }),
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
          value: JSON.stringify({ route: 'dedicated_app' }),
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.primeKangurLaunchRouteRuntimeMock).toHaveBeenCalledWith(
      JSON.stringify({ route: 'dedicated_app' })
    );
    expect(mocks.writeKangurLaunchRouteDevSnapshotMock).toHaveBeenCalledWith(
      JSON.stringify({ route: 'dedicated_app' })
    );
    await expect(response.json()).resolves.toEqual({
      key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
      value: JSON.stringify({ route: 'dedicated_app' }),
    });
  });

  it('rejects invalid playwright runtime action manifests before writing settings', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'runtime_action__tradera_quicklist_list',
            name: 'Tradera Quicklist List',
            description: 'Invalid runtime manifest',
            runtimeKey: 'tradera_quicklist_list',
            blocks: [
              {
                id: 'block_sell_page_open',
                kind: 'runtime_step',
                refId: 'sell_page_open',
                enabled: true,
                label: null,
              },
              {
                id: 'block_browser_open',
                kind: 'runtime_step',
                refId: 'browser_open',
                enabled: true,
                label: null,
              },
              {
                id: 'block_publish',
                kind: 'runtime_step',
                refId: 'publish',
                enabled: true,
                label: null,
              },
            ],
            stepSetIds: [],
            personaId: null,
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z',
          },
        ]),
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
          value: 'ignored-by-mock',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(400);
    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'Runtime action "tradera_quicklist_list" must include publish and publish_verify.',
    });
  });

  it('canonicalizes valid playwright actions before persisting them', async () => {
    const incomingValue = JSON.stringify([
      {
        id: 'legacy_action',
        name: 'Legacy action',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: ['step_set_1'],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]);

    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        value: incomingValue,
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
          value: incomingValue,
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY },
      expect.objectContaining({ $set: expect.objectContaining({ value: expect.any(String) }) }),
      { upsert: true }
    );
    const update = mocks.updateOneMock.mock.calls[0]?.[1] as
      | { $set?: { value?: unknown } }
      | undefined;
    const normalizedValue = update?.$set?.value;
    expect(typeof normalizedValue).toBe('string');
    const normalizedActions = JSON.parse(normalizedValue as string) as Array<Record<string, unknown>>;
    expect(normalizedActions).toHaveLength(1);
    const action = normalizedActions[0] as Record<string, unknown>;
    expect(action).toEqual(
      expect.objectContaining({
        id: 'legacy_action',
        name: 'Legacy action',
        stepSetIds: ['step_set_1'],
      })
    );
    const blocks = action['blocks'] as Array<Record<string, unknown>>;
    expect(blocks).toEqual([
      expect.objectContaining({
        id: 'legacy_action__step_set__0',
        kind: 'step_set',
        refId: 'step_set_1',
        enabled: true,
      }),
    ]);
    await expect(response.json()).resolves.toEqual({
      key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
      value: normalizedValue,
    });
  });

  it('stores secret setting writes through the secret settings store and redacts the response', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'auth_google_client_secret',
        value: 'google-secret',
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'auth_google_client_secret',
          value: 'google-secret',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertSecretSettingValueMock).toHaveBeenCalledWith(
      'auth_google_client_secret',
      'google-secret'
    );
    expect(mocks.deleteSecretSettingValuesMock).not.toHaveBeenCalled();
    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    expect(mocks.getAppDbProviderMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      key: 'auth_google_client_secret',
      value: '',
    });
  });

  it('deletes secret settings when a blank value is posted', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        key: 'auth_google_client_secret',
        value: '   ',
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'auth_google_client_secret',
          value: '   ',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertSecretSettingValueMock).not.toHaveBeenCalled();
    expect(mocks.deleteSecretSettingValuesMock).toHaveBeenCalledWith([
      'auth_google_client_secret',
    ]);
    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      key: 'auth_google_client_secret',
      value: '',
    });
  });

  it('does not return secret settings for direct key reads', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/settings?scope=light&key=auth_google_client_secret'),
      {
        ...createContext(),
        query: { scope: 'light', key: 'auth_google_client_secret' },
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.findOneMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([]);
  });

  it('filters Mongo-backed secret settings out of settings lists before decoding values', async () => {
    const findSettingsMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'public_setting',
          key: 'public_setting',
          value: 'public-value',
        },
        {
          _id: 'auth_google_client_secret',
          key: 'auth_google_client_secret',
          value: 'google-secret',
        },
        {
          _id: 'filemaker_mail_account_account-1_smtp_password',
          key: 'filemaker_mail_account_account-1_smtp_password',
          value: 'smtp-secret',
        },
      ]),
    });
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        createIndex: mocks.createIndexMock,
        find: findSettingsMock,
        findOne: mocks.findOneMock,
        updateOne: mocks.updateOneMock,
      })),
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings?scope=light'),
      {
        ...createContext(),
        query: { scope: 'light' },
      }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Array<{ key: string; value: string }>;
    expect(payload).toEqual(
      expect.arrayContaining([
        {
          key: 'public_setting',
          value: 'public-value',
        },
      ])
    );
    expect(payload.some((entry) => entry.key === 'auth_google_client_secret')).toBe(false);
    expect(
      payload.some((entry) => entry.key === 'filemaker_mail_account_account-1_smtp_password')
    ).toBe(false);
  });

  it('self-seeds the Mongo-backed theme catalog when the admin requests it directly', async () => {
    mocks.isKangurSettingKeyMock.mockImplementation((key: string) => key.startsWith('kangur_'));
    mocks.ensureKangurThemeCatalogSeededMock.mockResolvedValue({
      key: KANGUR_THEME_CATALOG_KEY,
      value: '[{"id":"kangur-daily-bloom","name":"Daily Bloom"}]',
    });

    const response = await getHandler(
      new NextRequest(
        `http://localhost/api/settings?scope=light&key=${encodeURIComponent(KANGUR_THEME_CATALOG_KEY)}`
      ),
      {
        ...createContext(),
        query: { scope: 'light', key: KANGUR_THEME_CATALOG_KEY },
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.ensureKangurThemeCatalogSeededMock).toHaveBeenCalledTimes(1);
    expect(mocks.readKangurSettingValueMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      {
        key: KANGUR_THEME_CATALOG_KEY,
        value: '[{"id":"kangur-daily-bloom","name":"Daily Bloom"}]',
      },
    ]);
  });

  it('includes seeded slot assignments in the light settings payload for fresh admin loads', async () => {
    const findSettingsMock = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        createIndex: mocks.createIndexMock,
        find: findSettingsMock,
        findOne: mocks.findOneMock,
        updateOne: mocks.updateOneMock,
      })),
    });
    mocks.ensureKangurStorefrontAppearanceSettingsSeededMock.mockResolvedValue([
      { key: 'kangur_storefront_default_mode_v1', value: 'default' },
    ]);
    mocks.ensureKangurThemeCatalogSeededMock.mockResolvedValue({
      key: KANGUR_THEME_CATALOG_KEY,
      value: '[{"id":"kangur-daily-bloom","name":"Daily Bloom"}]',
    });
    mocks.ensureKangurThemePresetManifestSeededMock.mockResolvedValue({
      key: 'kangur_cms_theme_preset_manifest_v1',
      value: '[]',
    });
    mocks.ensureKangurThemeSlotAssignmentsSeededMock.mockResolvedValue({
      key: KANGUR_SLOT_ASSIGNMENTS_KEY,
      value: '{"daily":{"id":"factory_daily","name":"Daily Factory"}}',
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings?scope=light'),
      {
        ...createContext(),
        query: { scope: 'light' },
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.ensureKangurThemeSlotAssignmentsSeededMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        {
          key: KANGUR_SLOT_ASSIGNMENTS_KEY,
          value: '{"daily":{"id":"factory_daily","name":"Daily Factory"}}',
        },
      ])
    );
  });
});
