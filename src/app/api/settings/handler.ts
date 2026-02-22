import { Prisma } from '@prisma/client';
import { WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { upsertAiPathsSetting } from '@/features/ai/ai-paths/server';
import {
  FASTCOMET_STORAGE_CONFIG_SETTING_KEY,
  FILE_STORAGE_SOURCE_SETTING_KEY,
} from '@/features/files/constants/storage-settings';
import { invalidateFileStorageSettingsCache } from '@/features/files/services/storage/file-storage-service';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
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
import {
  invalidateDatabaseEnginePolicyCache,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
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

const shouldLog = () => process.env['DEBUG_SETTINGS'] === 'true';

type SettingDocument = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

const SETTINGS_COLLECTION = 'settings';
const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';
const AI_PATHS_KEY_PREFIX = 'ai_paths_';
const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v1';
const HEAVY_PREFIXES = ['image_studio_', 'base_import_', 'base_export_'];
const HEAVY_KEYS = new Set<string>(['agent_personas']);
const HEAVY_PREFIX_REGEX = new RegExp(`^(${HEAVY_PREFIXES.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
const AI_PATHS_PREFIX_REGEX = new RegExp(`^${AI_PATHS_KEY_PREFIX.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`);
const DEFAULT_SCOPE: SettingsScope = 'light';
let settingsIndexesEnsured: Promise<void> | null = null;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
const SETTINGS_SLOW_SCOPE_TIMEOUT_MS = parsePositiveInt(
  process.env['SETTINGS_SLOW_SCOPE_TIMEOUT_MS'],
  3_000
);
const isSlowSettingsScope = (scope: SettingsScope): boolean =>
  scope === 'all' || scope === 'heavy';
const isSettingsTimeoutError = (error: unknown): error is Error =>
  error instanceof Error &&
  error.message.includes('[settings]') &&
  error.message.includes('timed out');

const withSettingsScopeTimeout = async <T,>(
  scope: SettingsScope,
  label: string,
  promise: Promise<T>
): Promise<T> => {
  if (!isSlowSettingsScope(scope)) return await promise;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`[settings] ${label} timed out after ${SETTINGS_SLOW_SCOPE_TIMEOUT_MS}ms`));
    }, SETTINGS_SLOW_SCOPE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const ensureSettingsIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  if (!settingsIndexesEnsured) {
    settingsIndexesEnsured = (async (): Promise<void> => {
      try {
        const mongo = await getMongoDb();
        await mongo.collection(SETTINGS_COLLECTION).createIndex({ key: 1 }, { name: 'settings_key' });
      } catch (error) {
        await ErrorSystem.logWarning('[settings] Failed to ensure settings indexes.', {
          service: 'api/settings',
          error,
        });
      }
    })();
  }
  await settingsIndexesEnsured;
};
const isHeavySettingKey = (key: string): boolean =>
  HEAVY_KEYS.has(key) || HEAVY_PREFIXES.some((prefix) => key.startsWith(prefix));
const isAiPathsSettingKey = (key: string): boolean => key.startsWith(AI_PATHS_KEY_PREFIX);

const canUsePrismaSettings = (provider: 'prisma' | 'mongodb') =>
  provider === 'prisma' && Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const readPrismaSettingsForScope = async (scope: SettingsScope): Promise<SettingRecord[]> => {
  if (!process.env['DATABASE_URL'] || !('setting' in prisma)) return [];
  try {
    const settings = await prisma.setting.findMany({
      where: buildPrismaScopeWhere(scope),
      select: { key: true, value: true },
    });
    return applyScopeFilter(settings, scope);
  } catch (error) {
    if (isPrismaMissingTableError(error)) return [];
    throw error;
  }
};

const parseUpdatedAtMsFromPathConfig = (raw: string): number | null => {
  try {
    const parsed = JSON.parse(raw) as { updatedAt?: unknown };
    if (typeof parsed?.updatedAt !== 'string') return null;
    const ms = Date.parse(parsed.updatedAt);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
};

const parsePathConfigObject = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const mergeRuntimeOnlyPathConfigWrite = (
  currentRaw: string,
  incomingRaw: string
): string | null => {
  const current = parsePathConfigObject(currentRaw);
  const incoming = parsePathConfigObject(incomingRaw);
  if (!current || !incoming) return null;

  const merged: Record<string, unknown> = {
    ...current,
    ...(Object.prototype.hasOwnProperty.call(incoming, 'runtimeState')
      ? { runtimeState: incoming['runtimeState'] }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(incoming, 'lastRunAt')
      ? { lastRunAt: incoming['lastRunAt'] }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(incoming, 'updatedAt')
      ? { updatedAt: incoming['updatedAt'] }
      : {}),
  };
  return JSON.stringify(merged);
};

const isRuntimeOnlyPathConfigPayload = (raw: string): boolean => {
  const parsed = parsePathConfigObject(raw);
  if (!parsed) return false;
  const hasRuntimeFields =
    Object.prototype.hasOwnProperty.call(parsed, 'runtimeState') ||
    Object.prototype.hasOwnProperty.call(parsed, 'lastRunAt') ||
    Object.prototype.hasOwnProperty.call(parsed, 'updatedAt');
  if (!hasRuntimeFields) return false;
  const hasGraphFields =
    Object.prototype.hasOwnProperty.call(parsed, 'nodes') ||
    Object.prototype.hasOwnProperty.call(parsed, 'edges');
  return !hasGraphFields;
};

const readCurrentSettingValue = async (
  key: string,
  provider: 'prisma' | 'mongodb'
): Promise<string | null> => {
  const readPrisma = async (): Promise<string | null> => {
    if (!canUsePrismaSettings(provider)) return null;
    try {
      const record = await prisma.setting.findUnique({
        where: { key },
        select: { value: true },
      });
      return record?.value ?? null;
    } catch (error) {
      if (isPrismaMissingTableError(error)) return null;
      throw error;
    }
  };

  const readMongo = async (): Promise<string | null> => {
    if (!process.env['MONGODB_URI']) return null;
    await ensureSettingsIndexes();
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<SettingDocument>(SETTINGS_COLLECTION)
      .findOne({ key }, { projection: { value: 1 } });
    return typeof doc?.value === 'string' ? doc.value : null;
  };

  return provider === 'mongodb' ? readMongo() : readPrisma();
};

const settingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
  expectedRevision: z.number().int().min(0).optional(),
  mutationId: z.string().trim().min(1).max(200).optional(),
});

const parseCaseResolverWorkspaceMetadata = (raw: string | null): {
  revision: number;
  lastMutationId: string | null;
} => {
  if (!raw) {
    return {
      revision: 0,
      lastMutationId: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        revision: 0,
        lastMutationId: null,
      };
    }
    const revisionRaw = parsed['workspaceRevision'];
    const revision =
      typeof revisionRaw === 'number' && Number.isFinite(revisionRaw) && revisionRaw > 0
        ? Math.floor(revisionRaw)
        : 0;
    const mutationRaw = parsed['lastMutationId'];
    const lastMutationId =
      typeof mutationRaw === 'string' && mutationRaw.trim().length > 0
        ? mutationRaw.trim()
        : null;
    return {
      revision,
      lastMutationId,
    };
  } catch {
    return {
      revision: 0,
      lastMutationId: null,
    };
  }
};


const normalizeScope = (scope?: string | null): SettingsScope => {
  if (scope === 'heavy' || scope === 'light' || scope === 'all') return scope;
  return DEFAULT_SCOPE;
};

const applyScopeFilter = (settings: SettingRecord[], scope: SettingsScope): SettingRecord[] => {
  const withoutAiPaths = settings.filter(
    (setting: SettingRecord) => !isAiPathsSettingKey(setting.key)
  );
  if (scope === 'all') return withoutAiPaths;
  if (scope === 'heavy') {
    return withoutAiPaths.filter((setting: SettingRecord) =>
      isHeavySettingKey(setting.key)
    );
  }
  return withoutAiPaths.filter(
    (setting: SettingRecord) => !isHeavySettingKey(setting.key)
  );
};

const buildPrismaScopeWhere = (scope: SettingsScope): Record<string, unknown> => {
  const aiPathsExclusion = { key: { startsWith: AI_PATHS_KEY_PREFIX } };
  if (scope === 'all') return { NOT: aiPathsExclusion };
  const heavyOr = [
    ...HEAVY_PREFIXES.map((prefix) => ({ key: { startsWith: prefix } })),
    { key: { in: Array.from(HEAVY_KEYS) } },
  ];
  if (scope === 'heavy') {
    return { AND: [{ OR: heavyOr }, { NOT: aiPathsExclusion }] };
  }
  return {
    AND: [
      { NOT: { OR: heavyOr } },
      { NOT: aiPathsExclusion },
    ],
  };
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
    { key: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $type: 'string', $regex: HEAVY_PREFIX_REGEX } },
  ];
  if (scope === 'heavy') {
    return { $and: [{ $or: heavyOr }, aiPathsFilter] };
  }
  return { $and: [{ $nor: heavyOr }, aiPathsFilter] };
};

const listMongoSettings = async (scope: SettingsScope): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const query = buildMongoScopeQuery(scope);
  const docs = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .find(query, { projection: { _id: 1, key: 1, value: 1 } })
    .toArray();
  return docs
    .map((doc: WithId<SettingDocument>) => ({ key: doc.key ?? String(doc._id), value: doc.value }))
    .filter((doc: SettingRecord) => typeof doc.key === 'string' && typeof doc.value === 'string');
};

const upsertMongoSetting = async (
  key: string,
  value: string
): Promise<SettingRecord | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

const shouldLogTiming = () => process.env['DEBUG_API_TIMING'] === 'true';

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (response: Response, entries: Record<string, number | null | undefined>): void => {
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
  const provider = await getAppDbProvider();
  if (timings) timings['provider'] = performance.now() - totalStart;
  let settings: SettingRecord[];
  if (provider === 'mongodb') {
    const mongoStart = performance.now();
    settings = await listMongoSettings(scope);
    if (timings) timings['mongo'] = performance.now() - mongoStart;
  } else {
    if (!canUsePrismaSettings(provider)) {
      throw internalError('Prisma settings store is unavailable. Configure DATABASE_URL.');
    }
    const prismaStart = performance.now();
    try {
      settings = await prisma.setting.findMany({
        where: buildPrismaScopeWhere(scope),
        select: { key: true, value: true },
      });
      settings = applyScopeFilter(settings, scope);
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        throw internalError(
          'Prisma settings table is missing. Run migrations manually in Workflow Database -> Database Engine.'
        );
      }
      throw error;
    } finally {
      if (timings) timings['prisma'] = performance.now() - prismaStart;
    }
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
  req: NextRequest,
  _ctx: ApiHandlerContext,
  scopeOverride?: SettingsScope
): Promise<Response> {
  const requestStart = performance.now();
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] GET /api/settings', { service: 'api/settings' });
  }
  const scope = scopeOverride ?? normalizeScope(req.nextUrl.searchParams.get('scope'));
  const requestedKey = req.nextUrl.searchParams.get('key')?.trim() ?? '';
  const forceFresh = req.nextUrl.searchParams.get('fresh') === '1';
  
  // Use no-store for settings to ensure freshness
  const SETTINGS_CACHE_CONTROL = 'no-store';

  if (req.nextUrl.searchParams.get('debug') === '1' && isSettingsCacheDebugEnabled()) {
    const response = NextResponse.json(getSettingsCacheStats(), {
      headers: { 'Cache-Control': 'no-store' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }

  if (requestedKey.length > 0) {
    const timings: Record<string, number | null | undefined> = {};
    const providerStart = performance.now();
    const provider = await getAppDbProvider();
    timings['provider'] = performance.now() - providerStart;
    const readStart = performance.now();
    const value = await readCurrentSettingValue(requestedKey, provider);
    timings['single'] = performance.now() - readStart;
    const payload: SettingRecord[] =
      value === null ? [] : [{ key: requestedKey, value }];
    const response = NextResponse.json(payload, {
      headers: {
        'Cache-Control': SETTINGS_CACHE_CONTROL,
        'X-Cache': value === null ? 'key-miss' : 'key-hit',
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
  const buildTimeoutFallbackResponse = async (
    reason: string
  ): Promise<Response> => {
    const fallbackFromAll =
      scope === 'heavy'
        ? (() => {
          const allKnown = getLastKnownSettings('all');
          return allKnown ? applyScopeFilter(allKnown, 'heavy') : null;
        })()
        : null;
    const fallbackFromLight =
      scope === 'all' ? getLastKnownSettings('light') : null;
    let fallbackData =
      stale ??
      lastKnown ??
      fallbackFromAll ??
      fallbackFromLight ??
      [];
    let cacheStatus = stale
      ? 'timeout-stale'
      : lastKnown
        ? 'timeout-last-known'
        : fallbackFromAll
          ? 'timeout-all-fallback'
          : fallbackFromLight
            ? 'timeout-light-fallback'
            : 'timeout-empty';
    if (fallbackData.length === 0) {
      try {
        const prismaFallback = await readPrismaSettingsForScope(scope);
        if (prismaFallback.length > 0) {
          fallbackData = prismaFallback;
          cacheStatus = 'timeout-prisma-fallback';
          setCachedSettings(prismaFallback, scope);
        }
      } catch (error) {
        await logSystemEvent({
          level: 'warn',
          message: '[settings] Prisma timeout fallback failed.',
          error,
          context: { scope },
        });
      }
    }
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
    let data: SettingRecord[];
    try {
      data = await withSettingsScopeTimeout(
        scope,
        'fresh fetch',
        fetchAndCacheSettings(scope, timings)
      );
    } catch (error) {
      if (isSettingsTimeoutError(error)) {
        return await buildTimeoutFallbackResponse(error.message);
      }
      throw error;
    }
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
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0, ...timings });
    return response;
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
        void ErrorSystem.captureException(error, { service: 'api/settings', action: 'stale_refresh' });
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
  const inflightPromise = fetchAndCacheSettings(scope, timings)
    .finally(() => {
      setSettingsInflight(null, scope);
    });
  setSettingsInflight(inflightPromise, scope);
  let data: SettingRecord[];
  try {
    data = await withSettingsScopeTimeout(scope, 'cache miss fetch', inflightPromise);
  } catch (error) {
    if (isSettingsTimeoutError(error)) {
      return await buildTimeoutFallbackResponse(error.message);
    }
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
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] POST /api/settings', { service: 'api/settings' });
  }
  clearSettingsCache();
  const parsed = await parseJsonBody(req, settingSchema, {
    logPrefix: 'settings.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { key } = parsed.data;
  const expectedRevision = parsed.data.expectedRevision;
  const mutationId = parsed.data.mutationId;
  let value = parsed.data.value;
  if (isAiPathsSettingKey(key)) {
    const migrated = await upsertAiPathsSetting(key, value);
    return NextResponse.json(migrated);
  }
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] upserting', { service: 'api/settings', key, valuePreview: value.slice(0, 40) });
  }
  const provider = await getAppDbProvider();
  if (key === CASE_RESOLVER_WORKSPACE_KEY && expectedRevision !== undefined) {
    const currentValue = await readCurrentSettingValue(key, provider);
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
    const currentValueForPathConfig = await readCurrentSettingValue(key, provider);
    if (currentValueForPathConfig && isRuntimeOnlyPathConfigPayload(value)) {
      const mergedValue = mergeRuntimeOnlyPathConfigWrite(currentValueForPathConfig, value);
      if (mergedValue) {
        value = mergedValue;
      }
    }
    const incomingUpdatedAtMs = parseUpdatedAtMsFromPathConfig(value);
    if (incomingUpdatedAtMs !== null) {
      const currentValue = currentValueForPathConfig ?? (await readCurrentSettingValue(key, provider));
      if (currentValue) {
        const currentUpdatedAtMs = parseUpdatedAtMsFromPathConfig(currentValue);
        if (currentUpdatedAtMs !== null && currentUpdatedAtMs > incomingUpdatedAtMs) {
          return NextResponse.json({ key, value: currentValue });
        }
      }
    }
  }
  let prismaSetting: SettingRecord | null = null;
  let mongoSetting: SettingRecord | null = null;
  if (provider === 'prisma') {
    if (!canUsePrismaSettings(provider)) {
      throw internalError('Prisma settings store is unavailable. Configure DATABASE_URL.');
    }
    try {
      prismaSetting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
        select: { key: true, value: true },
      });
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        throw internalError(
          'Prisma settings table is missing. Run migrations manually in Workflow Database -> Database Engine.'
        );
      }
      throw error;
    }
  }
  if (provider === 'mongodb') {
    mongoSetting = await upsertMongoSetting(key, value);
  }
  const setting = prismaSetting ?? mongoSetting;
  if (!setting) {
    throw internalError('No settings store configured.');
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
  return NextResponse.json(setting);
}

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';
