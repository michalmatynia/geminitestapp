import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_LAUNCH_ROUTE_SETTINGS_KEY } from '@/shared/contracts/kangur-settings-keys';
import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { KANGUR_SLOT_ASSIGNMENTS_KEY, KANGUR_THEME_CATALOG_KEY } from '@/shared/contracts/kangur';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  resetServerLoggingControlsCacheMock: vi.fn(),
  clearLiteSettingsServerCacheMock: vi.fn(),
  invalidateKangurStorefrontInitialStateCacheMock: vi.fn(),
  isKangurStorefrontInitialStateDependencyKeyMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  createIndexMock: vi.fn(),
  findOneMock: vi.fn(),
  updateOneMock: vi.fn(),
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

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
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

import { getHandler, postHandler } from './handler';

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

    const normalizedValue = JSON.stringify([
      {
        id: 'legacy_action',
        name: 'Legacy action',
        description: null,
        runtimeKey: null,
        blocks: [
          {
            id: 'legacy_action__step_set__0',
            kind: 'step_set',
            refId: 'step_set_1',
            enabled: true,
            label: null,
            config: {
              viewportWidth: null,
              viewportHeight: null,
              settleDelayMs: null,
              locale: null,
              timezoneId: null,
              userAgent: null,
              colorScheme: null,
              reducedMotion: null,
              geolocationLatitude: null,
              geolocationLongitude: null,
              permissions: [],
            },
          },
        ],
        stepSetIds: ['step_set_1'],
        personaId: null,
        executionSettings: {
          headless: null,
          browserPreference: null,
          emulateDevice: null,
          deviceName: null,
          slowMo: null,
          timeout: null,
          navigationTimeout: null,
          locale: null,
          timezoneId: null,
        },
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
      expect.objectContaining({
        $set: expect.objectContaining({ value: normalizedValue }),
      }),
      { upsert: true }
    );
    await expect(response.json()).resolves.toEqual({
      key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
      value: normalizedValue,
    });
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
