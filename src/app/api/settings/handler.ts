import { primeFrontPageSettingRuntime } from '@/app/(frontend)/home/home-helpers';
import { WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { upsertAiPathsSetting } from '@/features/ai/ai-paths/server';
import {
  invalidateKangurStorefrontInitialStateCache,
  isKangurStorefrontInitialStateDependencyKey,
} from '@/features/kangur/server';
import {
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS,
  ensureKangurStorefrontAppearanceSettingsSeeded,
} from '@/features/kangur/server-source';
import { ensureKangurThemeCatalogSeeded } from '@/features/kangur/appearance/server/theme-catalog-source';
import { ensureKangurThemePresetManifestSeeded } from '@/features/kangur/appearance/server/theme-preset-manifest-source';
import { ensureKangurThemeSlotAssignmentsSeeded } from '@/features/kangur/appearance/server/theme-slot-assignments-source';
import {
  isKangurSettingKey,
  listKangurSettings,
  readKangurSettingValue,
  upsertKangurSettingValue,
} from '@/features/kangur/server';
import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/server';
import {
  KANGUR_SLOT_ASSIGNMENTS_KEY,
  KANGUR_THEME_CATALOG_KEY,
  KANGUR_THEME_PRESET_MANIFEST_KEY,
} from '@/shared/contracts/kangur-settings-keys';
import {
  type MongoPersistedStringSettingDocument,
  upsertSettingSchema as settingSchema,
} from '@/shared/contracts/settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  invalidateAppDbProviderCache,
} from '@/shared/lib/db/app-db-provider';
import { invalidateCollectionProviderMapCache } from '@/shared/lib/db/collection-provider-map';
import {
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
} from '@/shared/lib/db/database-engine-constants';
import { invalidateDatabaseEnginePolicyCache } from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
} from '@/shared/lib/files/constants';
import { invalidateFileStorageSettingsCache } from '@/shared/lib/files/services/storage/file-storage-service';
import {
  getFrontPagePublicOwner,
  getFrontPageRedirectPath,
  normalizeFrontPageApp,
} from '@/shared/lib/front-page-app';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { resetServerLoggingControlsCache } from '@/shared/lib/observability/logging-controls-server';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import {
  AI_PATHS_CONFIG_PREFIX,
  AI_PATHS_PREFIX_REGEX,
  CASE_RESOLVER_WORKSPACE_KEY,
  HEAVY_PREFIX_REGEX,
  applyScopeFilter,
  isAiPathsSettingKey,
  isRuntimeOnlyPathConfigPayload,
  isSettingsTimeoutError,
  mergeRuntimeOnlyPathConfigWrite,
  parseCaseResolverWorkspaceMetadata,
  parseUpdatedAtMsFromPathConfig,
  withSettingsScopeTimeout,
} from '@/shared/lib/settings/settings-logic';
import {
  SettingRecord,
  getCachedSettings,
  setCachedSettings,
  clearSettingsCache,
  getSettingsCacheStats,
  isSettingsCacheDebugEnabled,
  getSettingsInflight,
  setSettingsInflight,
  getStaleSettings,
  getLastKnownSettings,
  type SettingsScope,
} from '@/shared/lib/settings-cache';
import { isLiteSettingsKey } from '@/shared/lib/settings-lite-keys';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const shouldLog = () => process.env['DEBUG_SETTINGS'] === 'true';
const CASE_RESOLVER_WORKSPACE_HISTORY_KEY = 'case_resolver_workspace_v2_history';
const CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY = 'case_resolver_workspace_v2_documents';
const CASE_RESOLVER_DETACHED_WORKSPACE_KEYS = new Set<string>([
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
]);

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_SCOPE: SettingsScope = 'light';
const FRONT_PAGE_SETTING_KEY = 'front_page_app';
let settingsIndexesEnsured: Promise<void> | null = null;

const TRADERA_RELIST_SCHEDULER_SETTING_KEYS = new Set<string>([
  TRADERA_SETTINGS_KEYS.schedulerEnabled,
  TRADERA_SETTINGS_KEYS.schedulerIntervalMs,
]);

const syncTraderaRelistSchedulerWorker = async (key: string): Promise<void> => {
  if (!TRADERA_RELIST_SCHEDULER_SETTING_KEYS.has(key)) return;
  try {
    const { startTraderaRelistSchedulerQueue } =
      await import('@/features/integrations/server');
    startTraderaRelistSchedulerQueue();
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.logWarning('[settings] Failed to sync Tradera relist scheduler worker.', {
      service: 'api/settings',
      key,
      error,
    });
  }
};

const ensureSettingsIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  if (!settingsIndexesEnsured) {
    settingsIndexesEnsured = (async (): Promise<void> => {
      try {
        const mongo = await getMongoDb();
        await mongo
          .collection(SETTINGS_COLLECTION)
          .createIndex({ key: 1 }, { name: 'settings_key' });
      } catch (error) {
        void ErrorSystem.captureException(error);
        await ErrorSystem.logWarning('[settings] Failed to ensure settings indexes.', {
          service: 'api/settings',
          error,
        });
      }
    })();
  }
  await settingsIndexesEnsured;
};

const readSeededKangurAppearanceSettingValue = async (
  key: string
): Promise<string | null> => {
  if (KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS.includes(key)) {
    const settings = await ensureKangurStorefrontAppearanceSettingsSeeded();
    return settings.find((setting) => setting.key === key)?.value ?? null;
  }
  if (key === KANGUR_THEME_CATALOG_KEY) {
    return (await ensureKangurThemeCatalogSeeded()).value;
  }
  if (key === KANGUR_THEME_PRESET_MANIFEST_KEY) {
    return (await ensureKangurThemePresetManifestSeeded()).value;
  }
  if (key === KANGUR_SLOT_ASSIGNMENTS_KEY) {
    return (await ensureKangurThemeSlotAssignmentsSeeded()).value;
  }
  return null;
};

const readCurrentSettingValue = async (
  key: string
): Promise<string | null> => {
  if (isKangurSettingKey(key)) {
    const seededCanonicalValue = await readSeededKangurAppearanceSettingValue(key);
    if (seededCanonicalValue !== null) {
      return seededCanonicalValue;
    }
    return await readKangurSettingValue(key);
  }
  const readMongo = async (): Promise<string | null> => {
    if (!process.env['MONGODB_URI']) return null;
    await ensureSettingsIndexes();
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION)
      .findOne({ key }, { projection: { value: 1 } });
    if (typeof doc?.value !== 'string') return null;
    return decodeSettingValue(key, doc.value);
  };

  return readMongo();
};

const maybeFilterDetachedCaseResolverPayloadByFileId = ({
  key,
  value,
  fileId,
}: {
  key: string;
  value: string;
  fileId: string;
}): string => {
  if (fileId.length === 0 || !CASE_RESOLVER_DETACHED_WORKSPACE_KEYS.has(key)) return value;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return value;
    const rawFiles = parsed['files'];
    if (!Array.isArray(rawFiles)) return value;
    const filteredFiles = rawFiles.filter((entry: unknown): boolean => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
      const entryId = (entry as Record<string, unknown>)['id'];
      return typeof entryId === 'string' && entryId === fileId;
    });
    return JSON.stringify({
      ...parsed,
      files: filteredFiles,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    return value;
  }
};

const normalizeScope = (scope?: string | null): SettingsScope => {
  if (scope === 'heavy' || scope === 'light' || scope === 'all') return scope;
  return DEFAULT_SCOPE;
};

const buildMongoScopeQuery = (scope: SettingsScope): Record<string, unknown> => {
  const aiPathsFilter = {
    $nor: [
      { key: { $regex: AI_PATHS_PREFIX_REGEX } },
      { _id: { $type: 'string', $regex: AI_PATHS_PREFIX_REGEX } },
    ],
  };
  if (scope === 'all') return aiPathsFilter;
  const heavyOr = [
    { key: { $regex: HEAVY_PREFIX_REGEX } },
    {
      key: {
        $in: [
          'agent_personas',
          'case_resolver_workspace_v2',
          'case_resolver_workspace_v2_history',
          'case_resolver_workspace_v2_documents',
          'product_validator_decision_log',
          'ai_insights_analytics_history',
          'ai_insights_runtime_analytics_history',
          'ai_insights_logs_history',
        ],
      },
    },
    {
      _id: {
        $in: [
          'agent_personas',
          'case_resolver_workspace_v2',
          'case_resolver_workspace_v2_history',
          'case_resolver_workspace_v2_documents',
          'product_validator_decision_log',
          'ai_insights_analytics_history',
          'ai_insights_runtime_analytics_history',
          'ai_insights_logs_history',
        ],
      },
    },
    { _id: { $type: 'string', $regex: HEAVY_PREFIX_REGEX } },
  ];
  if (scope === 'heavy') {
    return { $and: [{ $or: heavyOr }, aiPathsFilter] };
  }
  return { $and: [{ $nor: heavyOr }, aiPathsFilter] };
};

export const querySchema = z.object({
  scope: optionalTrimmedQueryString(),
  key: optionalTrimmedQueryString(),
  caseResolverFileId: optionalTrimmedQueryString(),
  fresh: z.preprocess((value) => value === '1', z.boolean()).default(false),
  debug: z.preprocess((value) => value === '1', z.boolean()).default(false),
  meta: z.preprocess((value) => value === '1', z.boolean()).default(false),
  ifRevisionGt: optionalIntegerQuerySchema(z.number().int().min(0)),
});

const listMongoSettings = async (scope: SettingsScope): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const query = buildMongoScopeQuery(scope);
  const docs = await mongo
    .collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION)
    .find(query, { projection: { _id: 1, key: 1, value: 1 } })
    .toArray();
  const baseSettings = docs
    .map((doc: WithId<MongoPersistedStringSettingDocument>) => ({
      key: doc.key ?? String(doc._id),
      value: decodeSettingValue(doc.key ?? String(doc._id), doc.value),
    }))
    .filter((doc: SettingRecord) => typeof doc.key === 'string' && typeof doc.value === 'string');
  if (scope === 'heavy') {
    return baseSettings;
  }

  const [kangurSettings, seededStorefrontAppearanceSettings, seededThemeCatalog, seededThemePresetManifest, seededThemeSlotAssignments] =
    await Promise.all([
      listKangurSettings(),
      ensureKangurStorefrontAppearanceSettingsSeeded(),
      ensureKangurThemeCatalogSeeded(),
      ensureKangurThemePresetManifestSeeded(),
      ensureKangurThemeSlotAssignmentsSeeded(),
    ]);

  const merged = new Map<string, string>();
  baseSettings.forEach((setting) => {
    merged.set(setting.key, setting.value);
  });
  kangurSettings.forEach((setting) => {
    merged.set(setting.key, setting.value);
  });
  seededStorefrontAppearanceSettings.forEach((setting) => {
    merged.set(setting.key, setting.value);
  });
  [
    seededThemeCatalog,
    seededThemePresetManifest,
    seededThemeSlotAssignments,
  ].forEach((setting) => {
    if (setting) {
      merged.set(setting.key, setting.value);
    }
  });
  return Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
};

const upsertMongoSetting = async (key: string, value: string): Promise<SettingRecord | null> => {
  if (isKangurSettingKey(key)) {
    return await upsertKangurSettingValue(key, value);
  }
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const now = new Date();
  const encodedValue = encodeSettingValue(key, value);
  await mongo.collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value: encodedValue, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value: encodedValue };
};

const normalizeIncomingSettingValue = (
  key: string,
  value: string
): { ok: true; value: string } | { ok: false; error: string } => {
  if (key !== FRONT_PAGE_SETTING_KEY) {
    return { ok: true, value };
  }

  const normalized = normalizeFrontPageApp(value);
  if (!normalized) {
    return {
      ok: false,
      error: 'front_page_app must be one of: cms, kangur, chatbot, notes.',
    };
  }

  return { ok: true, value: normalized };
};

const logFrontPageSettingChange = async ({
  previousValue,
  nextValue,
}: {
  previousValue: string | null;
  nextValue: string;
}): Promise<void> => {
  if (previousValue === nextValue) {
    return;
  }

  const previousPublicOwner = getFrontPagePublicOwner(previousValue);
  const nextPublicOwner = getFrontPagePublicOwner(nextValue);
  const movedAwayFromKangur =
    previousPublicOwner === 'kangur' && nextPublicOwner !== 'kangur';
  const restoredToKangur =
    previousPublicOwner !== 'kangur' && nextPublicOwner === 'kangur';

  await logSystemEvent({
    level: movedAwayFromKangur ? 'warn' : 'info',
    source: 'api/settings',
    service: 'api/settings',
    message: movedAwayFromKangur
      ? 'Front page app switched away from Kangur.'
      : restoredToKangur
        ? 'Front page app restored to Kangur.'
        : 'Front page app changed.',
    context: {
      key: FRONT_PAGE_SETTING_KEY,
      previousValue,
      nextValue,
      previousPublicOwner,
      nextPublicOwner,
      previousRedirectPath: getFrontPageRedirectPath(previousValue),
      nextRedirectPath: getFrontPageRedirectPath(nextValue),
    },
  });
};

const shouldLogTiming = () => process.env['DEBUG_API_TIMING'] === 'true';

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

const attachProviderHeader = async (response: Response): Promise<void> => {
  try {
    const provider = await getAppDbProvider();
    response.headers.set('X-App-Db-Provider', provider);
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.logWarning('[settings] Failed to resolve app DB provider.', {
      service: 'api/settings',
      error,
    });
  }
};

const fetchAndCacheSettings = async (
  scope: SettingsScope,
  timings?: Record<string, number | null | undefined>
): Promise<SettingRecord[]> => {
  const totalStart = performance.now();
  const mongoStart = performance.now();
  const settings = await listMongoSettings(scope);
  if (timings) {
    timings['provider'] = performance.now() - totalStart;
    timings['mongo'] = performance.now() - mongoStart;
  }
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] fetched', {
      service: 'api/settings',
      count: settings.length,
      keys: settings.map((setting: SettingRecord) => setting.key),
    });
  }
  setCachedSettings(settings, scope);
  if (timings) timings['total'] = performance.now() - totalStart;
  if (timings && shouldLogTiming()) {
    await ErrorSystem.logInfo('[timing] settings.fetch', {
      service: 'api/settings',
      scope,
      ...timings,
    });
  }
  return settings;
};

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  scopeOverride?: SettingsScope
): Promise<Response> {
  await assertSettingsManageAccess();
  const requestStart = performance.now();
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] GET /api/settings', { service: 'api/settings' });
  }
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const scope = scopeOverride ?? normalizeScope(query.scope);
  const requestedKey = query.key ?? '';
  const requestedCaseResolverFileId = query.caseResolverFileId ?? '';
  const forceFresh = query.fresh;

  // Use no-store for settings to ensure freshness
  const SETTINGS_CACHE_CONTROL = 'no-store';

  if (query.debug && isSettingsCacheDebugEnabled()) {
    const response = NextResponse.json(getSettingsCacheStats(), {
      headers: { 'Cache-Control': 'no-store' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }

  if (requestedKey.length > 0) {
    const timings: Record<string, number | null | undefined> = {};
    const returnMetadataOnly = requestedKey === CASE_RESOLVER_WORKSPACE_KEY && query.meta;
    const providerStart = performance.now();
    await getAppDbProvider();
    timings['provider'] = performance.now() - providerStart;
    const readStart = performance.now();
    const value = await readCurrentSettingValue(requestedKey);
    timings['single'] = performance.now() - readStart;
    if (returnMetadataOnly) {
      const metadata = parseCaseResolverWorkspaceMetadata(value);
      const response = NextResponse.json(
        {
          key: requestedKey,
          revision: metadata.revision,
          lastMutationId: metadata.lastMutationId,
          exists: value !== null,
        },
        {
          headers: {
            'Cache-Control': SETTINGS_CACHE_CONTROL,
            'X-Cache': value === null ? 'key-meta-miss' : 'key-meta-hit',
          },
        }
      );
      await attachProviderHeader(response);
      attachTimingHeaders(response, {
        total: performance.now() - requestStart,
        cache: 0,
        ...timings,
      });
      return response;
    }
    // Conditional fetch: if client provides its current revision, return upToDate signal instead
    // of the full value when the stored revision has not advanced beyond what the client has.
    const ifRevisionGt = query.ifRevisionGt ?? null;
    if (
      requestedKey === CASE_RESOLVER_WORKSPACE_KEY &&
      ifRevisionGt !== null &&
      Number.isFinite(ifRevisionGt) &&
      ifRevisionGt >= 0
    ) {
      const storedMeta = parseCaseResolverWorkspaceMetadata(value);
      if (value === null || storedMeta.revision <= ifRevisionGt) {
        const upToDateResponse = NextResponse.json(
          { key: requestedKey, revision: storedMeta.revision, upToDate: true },
          {
            headers: {
              'Cache-Control': SETTINGS_CACHE_CONTROL,
              'X-Cache': value === null ? 'key-missing' : 'revision-current',
            },
          }
        );
        await attachProviderHeader(upToDateResponse);
        attachTimingHeaders(upToDateResponse, {
          total: performance.now() - requestStart,
          cache: 0,
          ...timings,
        });
        return upToDateResponse;
      }
      // Stored revision > client revision — fall through to return full payload
    }
    const resolvedValue =
      value === null
        ? null
        : maybeFilterDetachedCaseResolverPayloadByFileId({
          key: requestedKey,
          value,
          fileId: requestedCaseResolverFileId,
        });
    const payload: SettingRecord[] =
      resolvedValue === null ? [] : [{ key: requestedKey, value: resolvedValue }];
    const response = NextResponse.json(payload, {
      headers: {
        'Cache-Control': SETTINGS_CACHE_CONTROL,
        'X-Cache': resolvedValue === null ? 'key-miss' : 'key-hit',
      },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, {
      total: performance.now() - requestStart,
      cache: 0,
      ...timings,
    });
    return response;
  }

  const stale = getStaleSettings(scope);
  const lastKnown = getLastKnownSettings(scope);
  const buildTimeoutFallbackResponse = async (reason: string): Promise<Response> => {
    const fallbackFromAll =
      scope === 'heavy'
        ? (() => {
          const allKnown = getLastKnownSettings('all');
          return allKnown ? applyScopeFilter(allKnown, 'heavy') : null;
        })()
        : null;
    const fallbackFromLight = scope === 'all' ? getLastKnownSettings('light') : null;
    let fallbackData = stale ?? lastKnown ?? fallbackFromAll ?? fallbackFromLight ?? [];
    let cacheStatus = stale
      ? 'timeout-stale'
      : lastKnown
        ? 'timeout-last-known'
        : fallbackFromAll
          ? 'timeout-all-fallback'
          : fallbackFromLight
            ? 'timeout-light-fallback'
            : 'timeout-empty';
    if (shouldLogTiming()) {
      await ErrorSystem.logWarning('[settings] cache fallback', {
        service: 'api/settings',
        scope,
        status: cacheStatus,
        reason,
      });
    }
    const response = NextResponse.json(fallbackData, {
      headers: {
        'Cache-Control': SETTINGS_CACHE_CONTROL,
        'X-Cache': cacheStatus,
        'X-Settings-Fallback': 'timeout',
      },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  };
  if (forceFresh) {
    const timings: Record<string, number | null | undefined> = {};
    try {
      const data = await withSettingsScopeTimeout(
        scope,
        'fresh fetch',
        fetchAndCacheSettings(scope, timings)
      );
      if (shouldLogTiming()) {
        await ErrorSystem.logInfo('[settings] cache bypass', {
          service: 'api/settings',
          scope,
          status: 'fresh',
        });
      }
      const response = NextResponse.json(data, {
        headers: { 'Cache-Control': SETTINGS_CACHE_CONTROL, 'X-Cache': 'fresh' },
      });
      await attachProviderHeader(response);
      attachTimingHeaders(response, {
        total: performance.now() - requestStart,
        cache: 0,
        ...timings,
      });
      return response;
    } catch (error) {
      void ErrorSystem.captureException(error);
      if (isSettingsTimeoutError(error)) {
        return await buildTimeoutFallbackResponse(error.message);
      }
      void ErrorSystem.captureException(error, {
        service: 'api/settings',
        action: 'GET_handler',
        scope,
        forceFresh: true,
      });
      throw error;
    }
  }
  const cached = getCachedSettings(scope);
  if (cached) {
    if (shouldLogTiming()) {
      await ErrorSystem.logInfo('[settings] cache hit', {
        service: 'api/settings',
        scope,
        status: 'hit',
      });
    }
    const response = NextResponse.json(cached, {
      headers: { 'Cache-Control': SETTINGS_CACHE_CONTROL, 'X-Cache': 'hit' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }
  const inflight = getSettingsInflight(scope);
  if (inflight) {
    let data: SettingRecord[];
    try {
      data = await withSettingsScopeTimeout(scope, 'inflight fetch', inflight);
    } catch (error) {
      void ErrorSystem.captureException(error);
      if (isSettingsTimeoutError(error)) {
        return await buildTimeoutFallbackResponse(error.message);
      }
      throw error;
    }
    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[settings] cache',
        context: { scope, status: 'wait' },
      });
    }
    const response = NextResponse.json(data, {
      headers: { 'Cache-Control': SETTINGS_CACHE_CONTROL, 'X-Cache': 'wait' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }

  if (stale) {
    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[settings] cache',
        context: { scope, status: 'stale' },
      });
    }
    const timings: Record<string, number | null | undefined> = {};
    const refreshPromise = fetchAndCacheSettings(scope, timings)
      .catch((error) => {
        // Log refresh error but return stale data to keep app running
        void ErrorSystem.captureException(error, {
          service: 'api/settings',
          action: 'stale_refresh',
        });
        return stale;
      })
      .finally(() => {
        setSettingsInflight(null, scope);
      });
    setSettingsInflight(refreshPromise, scope);
    const response = NextResponse.json(stale, {
      headers: { 'Cache-Control': SETTINGS_CACHE_CONTROL, 'X-Cache': 'stale' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }

  const timings: Record<string, number | null | undefined> = {};
  const inflightPromise = fetchAndCacheSettings(scope, timings).finally(() => {
    setSettingsInflight(null, scope);
  });
  setSettingsInflight(inflightPromise, scope);
  let data: SettingRecord[];
  try {
    data = await withSettingsScopeTimeout(scope, 'cache miss fetch', inflightPromise);
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (isSettingsTimeoutError(error)) {
      return await buildTimeoutFallbackResponse(error.message);
    }
    void ErrorSystem.captureException(error, {
      service: 'api/settings',
      action: 'GET_handler',
      scope,
      status: 'miss',
    });
    throw error;
  }
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[settings] cache',
      context: { scope, status: 'miss' },
    });
  }
  const response = NextResponse.json(data, {
    headers: { 'Cache-Control': SETTINGS_CACHE_CONTROL, 'X-Cache': 'miss' },
  });
  await attachProviderHeader(response);
  attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0, ...timings });
  return response;
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] POST /api/settings', { service: 'api/settings' });
  }
  clearSettingsCache();
  resetServerLoggingControlsCache();
  const parsed = await parseJsonBody(req, settingSchema, {
    logPrefix: 'settings.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { key } = parsed.data;
  if (isLiteSettingsKey(key) || key === APP_DB_PROVIDER_SETTING_KEY) {
    clearLiteSettingsServerCache();
  }
  const expectedRevision = parsed.data.expectedRevision;
  const mutationId = parsed.data.mutationId;
  let value = parsed.data.value;
  const normalizedIncomingValue = normalizeIncomingSettingValue(key, value);
  if (!normalizedIncomingValue.ok) {
    if (key === FRONT_PAGE_SETTING_KEY) {
      await logSystemEvent({
        level: 'warn',
        source: 'api/settings',
        service: 'api/settings',
        message: 'Rejected invalid front page app update.',
        context: {
          key,
          attemptedValue: value,
        },
      });
    }
    return NextResponse.json({ error: normalizedIncomingValue.error }, { status: 400 });
  }
  value = normalizedIncomingValue.value;
  let previousFrontPageValue: string | null = null;
  if (key === FRONT_PAGE_SETTING_KEY) {
    try {
      previousFrontPageValue = await readCurrentSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'api/settings',
        source: 'api/settings',
        action: 'readFrontPageSettingForAudit',
        key,
      });
    }
  }
  if (isAiPathsSettingKey(key)) {
    await upsertAiPathsSetting(key, value);
    return NextResponse.json({ success: true });
  }
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] upserting', {
      service: 'api/settings',
      key,
      valuePreview: value.slice(0, 40),
    });
  }
  const provider = await getAppDbProvider();
  if (key === CASE_RESOLVER_WORKSPACE_KEY && expectedRevision !== undefined) {
    const currentValue = await readCurrentSettingValue(key);
    const currentMetadata = parseCaseResolverWorkspaceMetadata(currentValue);
    if (
      mutationId &&
      currentMetadata.lastMutationId &&
      currentMetadata.lastMutationId === mutationId
    ) {
      return NextResponse.json({
        key,
        value: currentValue ?? value,
        idempotent: true,
        currentRevision: currentMetadata.revision,
      });
    }

    if (currentMetadata.revision !== expectedRevision) {
      return NextResponse.json(
        {
          key,
          value: currentValue ?? value,
          conflict: true,
          expectedRevision,
          currentRevision: currentMetadata.revision,
        },
        { status: 409 }
      );
    }
  }
  if (key.startsWith(AI_PATHS_CONFIG_PREFIX)) {
    const currentValueForPathConfig = await readCurrentSettingValue(key);
    if (currentValueForPathConfig && isRuntimeOnlyPathConfigPayload(value)) {
      const mergedValue = mergeRuntimeOnlyPathConfigWrite(currentValueForPathConfig, value);
      if (mergedValue) {
        value = mergedValue;
      }
    }
    const incomingUpdatedAtMs = parseUpdatedAtMsFromPathConfig(value);
    if (incomingUpdatedAtMs !== null) {
      const currentValue = currentValueForPathConfig ?? (await readCurrentSettingValue(key));
      if (currentValue) {
        const currentUpdatedAtMs = parseUpdatedAtMsFromPathConfig(currentValue);
        if (currentUpdatedAtMs !== null && currentUpdatedAtMs > incomingUpdatedAtMs) {
          return NextResponse.json({ key, value: currentValue });
        }
      }
    }
  }
  const setting = provider === 'mongodb' ? await upsertMongoSetting(key, value) : null;
  if (!setting) {
    throw internalError('No settings store configured.');
  }
  const normalizedSetting: SettingRecord = {
    key: setting.key,
    value: decodeSettingValue(setting.key, setting.value),
  };
  if (isKangurStorefrontInitialStateDependencyKey(setting.key)) {
    invalidateKangurStorefrontInitialStateCache();
  }
  if (setting.key === APP_DB_PROVIDER_SETTING_KEY) {
    invalidateAppDbProviderCache();
  }
  if (
    setting.key === FILE_STORAGE_SOURCE_SETTING_KEY ||
    setting.key === FASTCOMET_STORAGE_CONFIG_SETTING_KEY
  ) {
    invalidateFileStorageSettingsCache();
  }
  if (
    setting.key === DATABASE_ENGINE_POLICY_KEY ||
    setting.key === DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY ||
    setting.key === DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY ||
    setting.key === DATABASE_ENGINE_BACKUP_SCHEDULE_KEY ||
    setting.key === DATABASE_ENGINE_OPERATION_CONTROLS_KEY
  ) {
    invalidateDatabaseEnginePolicyCache();
    invalidateCollectionProviderMapCache();
  }
  await syncTraderaRelistSchedulerWorker(setting.key);
  if (setting.key === FRONT_PAGE_SETTING_KEY) {
    primeFrontPageSettingRuntime(normalizedSetting.value);
    await logFrontPageSettingChange({
      previousValue: previousFrontPageValue,
      nextValue: normalizedSetting.value,
    });
  }
  return NextResponse.json(normalizedSetting);
}

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';
