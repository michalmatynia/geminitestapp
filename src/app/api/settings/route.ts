export const runtime = 'nodejs';

import { Prisma } from '@prisma/client';
import { WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  invalidateAppDbProviderCache,
} from '@/shared/lib/db/app-db-provider';
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
import type { ApiHandlerContext } from '@/shared/types/api/api';

const shouldLog = () => process.env['DEBUG_SETTINGS'] === 'true';

type SettingDocument = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

const SETTINGS_COLLECTION = 'settings';
const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';
const HEAVY_PREFIXES = ['ai_paths_', 'image_studio_', 'base_import_', 'base_export_'];
const HEAVY_KEYS = new Set<string>(['agent_personas']);
const HEAVY_PREFIX_REGEX = new RegExp(`^(${HEAVY_PREFIXES.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
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
        await logSystemEvent({
          level: 'warn',
          message: '[settings] Failed to ensure settings indexes.',
          error,
        });
      }
    })();
  }
  await settingsIndexesEnsured;
};
const authSettingKeys: Set<string> = new Set(Object.values(AUTH_SETTINGS_KEYS));
const isMongoPreferredSettingKey = (key: string) => authSettingKeys.has(key);
const isHeavySettingKey = (key: string): boolean =>
  HEAVY_KEYS.has(key) || HEAVY_PREFIXES.some((prefix) => key.startsWith(prefix));

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
  const hasMongo = Boolean(process.env['MONGODB_URI']);
  const canUsePrisma = canUsePrismaSettings(provider);

  const readPrisma = async (): Promise<string | null> => {
    if (!canUsePrisma) return null;
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
    if (!hasMongo) return null;
    await ensureSettingsIndexes();
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<SettingDocument>(SETTINGS_COLLECTION)
      .findOne({ key }, { projection: { value: 1 } });
    return typeof doc?.value === 'string' ? doc.value : null;
  };

  if (provider === 'mongodb') {
    const mongoValue = await readMongo();
    if (mongoValue !== null) return mongoValue;
    return await readPrisma();
  }

  const prismaValue = await readPrisma();
  if (prismaValue !== null) return prismaValue;
  return await readMongo();
};

const settingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
});


const normalizeScope = (scope?: string | null): SettingsScope => {
  if (scope === 'heavy' || scope === 'light' || scope === 'all') return scope;
  return DEFAULT_SCOPE;
};

const applyScopeFilter = (settings: SettingRecord[], scope: SettingsScope): SettingRecord[] => {
  if (scope === 'all') return settings;
  if (scope === 'heavy') return settings.filter((setting: SettingRecord) => isHeavySettingKey(setting.key));
  return settings.filter((setting: SettingRecord) => !isHeavySettingKey(setting.key));
};

const buildPrismaScopeWhere = (scope: SettingsScope): Record<string, unknown> => {
  if (scope === 'all') return {};
  const heavyOr = [
    ...HEAVY_PREFIXES.map((prefix) => ({ key: { startsWith: prefix } })),
    { key: { in: Array.from(HEAVY_KEYS) } },
  ];
  if (scope === 'heavy') {
    return { OR: heavyOr };
  }
  return { NOT: { OR: heavyOr } };
};

const buildMongoScopeQuery = (scope: SettingsScope): Record<string, unknown> => {
  if (scope === 'all') return {};
  const heavyOr = [
    { key: { $regex: HEAVY_PREFIX_REGEX } },
    { key: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $in: Array.from(HEAVY_KEYS) } },
    { _id: { $type: 'string', $regex: HEAVY_PREFIX_REGEX } },
  ];
  if (scope === 'heavy') {
    return { $or: heavyOr };
  }
  return { $nor: heavyOr };
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

const SETTINGS_CACHE_CONTROL = 'private, max-age=120, stale-while-revalidate=600';
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
    await logSystemEvent({
      level: 'warn',
      message: '[settings] Failed to resolve app DB provider.',
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
  const hasMongo = Boolean(process.env['MONGODB_URI']);
  const envProvider = process.env['APP_DB_PROVIDER']?.toLowerCase().trim();
  const forcePrisma = envProvider === 'prisma';
  const prismaSettings: SettingRecord[] = [];
  let prismaMissing = false;
  if (canUsePrismaSettings(provider)) {
    const prismaStart = performance.now();
    try {
      const settings = await prisma.setting.findMany({
        where: buildPrismaScopeWhere(scope),
        select: { key: true, value: true },
      });
      prismaSettings.push(...applyScopeFilter(settings, scope));
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        prismaMissing = true;
        await logSystemEvent({
          level: 'warn',
          message: '[settings] Prisma settings table missing; falling back to Mongo.',
          context: { code: error.code },
        });
      } else {
        throw error;
      }
    } finally {
      if (timings) timings['prisma'] = performance.now() - prismaStart;
    }
  }
  const shouldReadMongoSettings = hasMongo && (!forcePrisma || prismaMissing);
  const mongoSettings = shouldReadMongoSettings
    ? await (async (): Promise<SettingRecord[]> => {
      const mongoStart = performance.now();
      const settings = await listMongoSettings(scope);
      if (timings) timings['mongo'] = performance.now() - mongoStart;
      return settings;
    })()
    : [];
  if (prismaMissing && !hasMongo) {
    await logSystemEvent({
      level: 'warn',
      message: '[settings] Prisma settings table missing and no Mongo fallback; returning empty settings.',
    });
  }
  const settingsMap = new Map<string, SettingRecord>();
  if (provider === 'mongodb') {
    mongoSettings.forEach((setting: SettingRecord) => {
      settingsMap.set(setting.key, setting);
    });
  } else {
    prismaSettings.forEach((setting: SettingRecord) => {
      if (!authSettingKeys.has(setting.key) || !hasMongo) {
        settingsMap.set(setting.key, setting);
      }
    });
    mongoSettings.forEach((setting: SettingRecord) => {
      const shouldOverride = prismaMissing || isMongoPreferredSettingKey(setting.key);
      if (shouldOverride) {
        settingsMap.set(setting.key, setting);
      }
    });
  }
  const settings = Array.from(settingsMap.values());
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
    await logSystemEvent({
      level: 'info',
      message: '[timing] settings.fetch',
      context: { scope, ...timings },
    });
  }
  return settings;
};

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  scopeOverride?: SettingsScope
): Promise<Response> {
  const requestStart = performance.now();
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] GET /api/settings', { service: 'api/settings' });
  }
  const scope = scopeOverride ?? normalizeScope(req.nextUrl.searchParams.get('scope'));
  if (req.nextUrl.searchParams.get('debug') === '1' && isSettingsCacheDebugEnabled()) {
    const response = NextResponse.json(getSettingsCacheStats(), {
      headers: { 'Cache-Control': 'no-store' },
    });
    await attachProviderHeader(response);
    attachTimingHeaders(response, { total: performance.now() - requestStart, cache: 0 });
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
      await logSystemEvent({
        level: 'warn',
        message: '[settings] cache',
        context: { scope, status: cacheStatus, reason },
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
  const cached = getCachedSettings(scope);
  if (cached) {
    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[settings] cache',
        context: { scope, status: 'hit' },
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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
  let value = parsed.data.value;
  if (shouldLog()) {
    await ErrorSystem.logInfo('[settings] upserting', { service: 'api/settings', key, valuePreview: value.slice(0, 40) });
  }
  const provider = await getAppDbProvider();
  let currentValueForPathConfig: string | null = null;
  if (key.startsWith(AI_PATHS_CONFIG_PREFIX)) {
    currentValueForPathConfig = await readCurrentSettingValue(key, provider);
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
  const hasMongo = Boolean(process.env['MONGODB_URI']);
  const shouldWriteMongo =
    hasMongo &&
    (provider === 'mongodb' || isMongoPreferredSettingKey(key) || !canUsePrismaSettings(provider));
  const shouldWritePrisma =
    canUsePrismaSettings(provider) && (!authSettingKeys.has(key) || !hasMongo);
  let prismaSetting: SettingRecord | null = null;
  let mongoSetting: SettingRecord | null = null;
  let prismaMissing = false;
  if (shouldWritePrisma) {
    try {
      prismaSetting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
        select: { key: true, value: true },
      });
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        prismaMissing = true;
        await logSystemEvent({
          level: 'warn',
          message: '[settings] Prisma settings table missing; falling back to Mongo.',
          context: { code: error.code },
        });
      } else {
        throw error;
      }
    }
  }
  const shouldWriteMongoFallback = shouldWriteMongo || (prismaMissing && hasMongo);
  if (shouldWriteMongoFallback) {
    mongoSetting = await upsertMongoSetting(key, value);
  }
  const setting = prismaSetting ?? mongoSetting;
  if (!setting) {
    const message = prismaMissing
      ? 'Settings table is missing in Prisma. Run prisma db push or configure MongoDB.'
      : 'No settings store configured';
    throw internalError(message);
  }
  if (setting.key === APP_DB_PROVIDER_SETTING_KEY) {
    invalidateAppDbProviderCache();
  }
  return NextResponse.json(setting);
}

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'settings.GET', rateLimitKey: disableSettingsRateLimit ? false : 'api' }
);
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'settings.POST', rateLimitKey: disableSettingsRateLimit ? false : 'write' }
);

export { GET_handler };
