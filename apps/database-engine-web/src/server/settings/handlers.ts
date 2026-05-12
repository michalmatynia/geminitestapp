import 'server-only';

/* eslint-disable max-lines */

import { type Collection, type Filter, type WithId } from 'mongodb';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  AppProviderDiagnostics,
  AppProviderServiceStatus,
  AppProviderSource,
  AppProviderValue,
} from '@/shared/contracts/system';
import {
  type MongoPersistedStringSettingDocument,
  type SettingRecord,
  type SettingsScope,
  upsertSettingSchema,
} from '@/shared/contracts/settings';
import {
  settingsBackfillRequestSchema,
  type SettingsBackfillResult,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  invalidateAppDbProviderCache,
} from '@/shared/lib/db/app-db-provider';
import { invalidateCollectionProviderMapCache } from '@/shared/lib/db/collection-provider-map';
import {
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
} from '@/shared/lib/db/database-engine-constants';
import {
  getDatabaseEnginePolicy,
  invalidateDatabaseEnginePolicyCache,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import {
  isSecretSettingKey,
  SECRET_SETTING_REDACTED_VALUE,
} from '@/shared/lib/settings/secret-setting-keys';
import {
  decodeSettingValue,
  encodeSettingValue,
} from '@/shared/lib/settings/settings-compression';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_SCOPE: SettingsScope = 'light';
const HEAVY_PREFIX_REGEX = /^(ai_|agent_|case_resolver_|product_validator_|ai_insights_)/;
const AI_PATHS_PREFIX_REGEX = /^ai_paths:/;
const AUTH_PROVIDER_SETTING_KEY = 'auth_provider';
const MINIMUM_SETTINGS_CACHE_TTL_MS = 60_000;

let settingsIndexesEnsured: Promise<void> | null = null;
let liteSettingsCache: { data: SettingRecord[]; ts: number } | null = null;
let liteSettingsCacheInflight: Promise<SettingRecord[]> | null = null;

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const querySchema = z.object({
  scope: optionalTrimmedQueryString(),
  key: optionalTrimmedQueryString(),
  fresh: z.preprocess((value) => value === '1', z.boolean()).default(false),
  debug: z.preprocess((value) => value === '1', z.boolean()).default(false),
  ifRevisionGt: optionalIntegerQuerySchema(z.number().int().min(0)),
});

export const liteQuerySchema = z.object({
  fresh: z.preprocess((value) => value === '1', z.boolean()).default(false),
});

const trimNullable = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? null : trimmed;
};

const hasMongoDatabaseUrl = (): boolean => {
  const mongoUri = process.env['MONGODB_URI'];
  return typeof mongoUri === 'string' && mongoUri.length > 0;
};

const normalizeProvider = (value: string | null): AppProviderValue | null => {
  if (value === null) return null;
  return value.toLowerCase() === 'mongodb' ? 'mongodb' : null;
};

const getProviderSource = (
  envProvider: AppProviderValue | null,
  mongoProvider: AppProviderValue | null,
  fallback: AppProviderSource | null
): AppProviderSource | null => {
  if (envProvider !== null) {
    return 'env';
  }
  if (mongoProvider !== null) {
    return 'mongo-setting';
  }
  return fallback;
};

const buildProviderServiceStatuses = ({
  appConfigured,
  appConfiguredSource,
  appEffective,
  authConfigured,
  authConfiguredSource,
}: {
  appConfigured: AppProviderValue | null;
  appConfiguredSource: AppProviderSource | null;
  appEffective: AppProviderValue;
  authConfigured: AppProviderValue;
  authConfiguredSource: AppProviderSource;
}): AppProviderServiceStatus[] => [
  {
    service: 'app',
    configured: appConfigured,
    configuredSource: appConfiguredSource,
    effective: appEffective,
    driftFromApp: false,
    notes: [],
  },
  {
    service: 'auth',
    configured: authConfigured,
    configuredSource: authConfiguredSource,
    effective: 'mongodb',
    driftFromApp: false,
    notes: [],
  },
  {
    service: 'product',
    configured: appEffective,
    configuredSource: 'derived',
    effective: appEffective,
    driftFromApp: false,
    notes: ['Database Engine standalone app does not own product data.'],
  },
  {
    service: 'integrations',
    configured: appEffective,
    configuredSource: 'derived',
    effective: appEffective,
    driftFromApp: false,
    notes: ['Database Engine standalone app does not own integration data.'],
  },
  {
    service: 'cms',
    configured: appEffective,
    configuredSource: 'derived',
    effective: appEffective,
    driftFromApp: false,
    notes: ['Database Engine standalone app does not own CMS data.'],
  },
];

const runBackfillDryRun = async (
  collection: Collection<{ _id: string; key?: string | null }>,
  filter: Filter<{ _id: string; key?: string | null }>
): Promise<SettingsBackfillResult> => {
  const matched = await collection.countDocuments(filter);
  const sample = await collection.find(filter, { projection: { _id: 1 } }).limit(5).toArray();
  return {
    matched,
    modified: 0,
    remaining: matched,
    sampleIds: sample.map((doc) => doc._id),
  };
};

const runBackfillUpdate = async (
  collection: Collection<{ _id: string; key?: string | null }>,
  filter: Filter<{ _id: string; key?: string | null }>,
  limit: number
): Promise<SettingsBackfillResult> => {
  const docs = await collection.find(filter, { projection: { _id: 1 } }).limit(limit).toArray();

  if (docs.length === 0) {
    return {
      matched: 0,
      modified: 0,
      remaining: 0,
    };
  }

  const result = await collection.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { key: doc._id } },
      },
    })),
    { ordered: false }
  );

  const remaining = await collection.countDocuments(filter);
  return {
    matched: docs.length,
    modified: result.modifiedCount,
    remaining,
  };
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
    { _id: { $type: 'string', $regex: HEAVY_PREFIX_REGEX } },
  ];
  if (scope === 'heavy') {
    return { $and: [{ $or: heavyOr }, aiPathsFilter] };
  }
  return { $and: [{ $nor: heavyOr }, aiPathsFilter] };
};

const ensureSettingsIndexes = async (): Promise<void> => {
  await applyActiveMongoSourceEnv();
  if (!hasMongoDatabaseUrl()) return;
  settingsIndexesEnsured ??= (async (): Promise<void> => {
    try {
      const mongo = await getMongoDb();
      await mongo
        .collection(SETTINGS_COLLECTION)
        .createIndex({ key: 1 }, { name: 'settings_key' });
    } catch (error) {
      void ErrorSystem.captureException(error);
      await ErrorSystem.logWarning('[database-engine.settings] Failed to ensure indexes.', {
        service: 'database-engine.settings',
        error,
      });
    }
  })();
  await settingsIndexesEnsured;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  await applyActiveMongoSourceEnv();
  if (!hasMongoDatabaseUrl()) return null;
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ key }, { _id: key }] }, { projection: { value: 1 } });
  return typeof doc?.value === 'string' ? decodeSettingValue(key, doc.value) : null;
};

const listMongoSettings = async (scope: SettingsScope): Promise<SettingRecord[]> => {
  await applyActiveMongoSourceEnv();
  if (!hasMongoDatabaseUrl()) return [];
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION)
    .find(buildMongoScopeQuery(scope), { projection: { _id: 1, key: 1, value: 1 } })
    .toArray();
  return docs
    .map((doc: WithId<MongoPersistedStringSettingDocument>) => ({
      key: doc.key,
      value: doc.value,
    }))
    .filter(
      (doc): doc is SettingRecord =>
        !isSecretSettingKey(doc.key)
    )
    .map((doc) => ({
      key: doc.key,
      value: decodeSettingValue(doc.key, doc.value),
    }));
};

const upsertMongoSetting = async (key: string, value: string): Promise<SettingRecord> => {
  await applyActiveMongoSourceEnv();
  if (!hasMongoDatabaseUrl()) {
    throw internalError('MongoDB is not configured.');
  }
  await ensureSettingsIndexes();
  const mongo = await getMongoDb();
  const now = new Date();
  const encodedValue = encodeSettingValue(key, value);
  await mongo.collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { key, value: encodedValue, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

const clearLocalSettingsCaches = (): void => {
  liteSettingsCache = null;
};

const invalidateSettingSideEffects = (key: string): void => {
  clearLocalSettingsCaches();
  if (key === APP_DB_PROVIDER_SETTING_KEY) {
    invalidateAppDbProviderCache();
    invalidateCollectionProviderMapCache();
  }
  if (key === DATABASE_ENGINE_POLICY_KEY) {
    invalidateDatabaseEnginePolicyCache();
  }
  if (key === DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY) {
    invalidateCollectionProviderMapCache();
  }
};

export const readDatabaseEngineLiteSettings = async (): Promise<SettingRecord[]> => {
  const now = Date.now();
  const cached = liteSettingsCache;
  if (cached !== null && now - cached.ts < MINIMUM_SETTINGS_CACHE_TTL_MS) {
    return cached.data.map((setting) => ({ ...setting }));
  }
  if (liteSettingsCacheInflight !== null) {
    const inFlightData = await liteSettingsCacheInflight;
    return inFlightData.map((setting) => ({ ...setting }));
  }

  const loadSettings = async (): Promise<SettingRecord[]> => {
    const value = await readMongoSetting(APP_FONT_SET_SETTING_KEY);
    return value === null ? [] : [{ key: APP_FONT_SET_SETTING_KEY, value }];
  };

  const loadPromise = loadSettings();
  liteSettingsCacheInflight = loadPromise;
  try {
    const data = await loadPromise;
    // eslint-disable-next-line require-atomic-updates -- cache state may be updated by concurrent readers
    liteSettingsCache = { data, ts: now };
    return data.map((setting) => ({ ...setting }));
  } finally {
    // eslint-disable-next-line require-atomic-updates -- in-flight cache token is shared module state
    liteSettingsCacheInflight = null;
  }
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  scopeOverride?: SettingsScope
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const key = query.key ?? '';

  if (key.length > 0) {
    const value = isSecretSettingKey(key) ? null : await readMongoSetting(key);
    return NextResponse.json(
      value === null ? [] : [{ key, value }],
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const settings = await listMongoSettings(scopeOverride ?? normalizeScope(query.scope));
  return NextResponse.json(settings, { headers: { 'Cache-Control': 'no-store' } });
}

export async function getHeavyHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  return getHandler(req, ctx, 'heavy');
}

export async function getLiteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const settings = await readDatabaseEngineLiteSettings();
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Cache': settings.length > 0 ? 'local' : 'empty',
    },
  });
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const parsed = await parseJsonBody(req, upsertSettingSchema, {
    logPrefix: 'database-engine.settings.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { key, value } = parsed.data;
  if (isSecretSettingKey(key) && value === SECRET_SETTING_REDACTED_VALUE) {
    return NextResponse.json({ key, value });
  }

  const setting = await upsertMongoSetting(key, value);
  invalidateSettingSideEffects(key);
  return NextResponse.json(setting);
}

export async function getProvidersHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await applyActiveMongoSourceEnv();

  const hasMongoUri = hasMongoDatabaseUrl();
  const appDbProviderEnv = trimNullable(process.env['APP_DB_PROVIDER']);
  const authDbProviderEnv = trimNullable(process.env['AUTH_DB_PROVIDER']);
  const envAppProvider = normalizeProvider(appDbProviderEnv);
  const mongoAppProvider = normalizeProvider(await readMongoSetting(APP_DB_PROVIDER_SETTING_KEY));
  const appConfigured = envAppProvider ?? mongoAppProvider;
  const appConfiguredSource = getProviderSource(envAppProvider, mongoAppProvider, null);
  const appEffective = await getAppDbProvider();

  const envAuthProvider = normalizeProvider(authDbProviderEnv);
  const mongoAuthProvider = normalizeProvider(await readMongoSetting(AUTH_PROVIDER_SETTING_KEY));
  const authConfigured = envAuthProvider ?? mongoAuthProvider ?? appEffective;
  const authConfiguredSource = getProviderSource(
    envAuthProvider,
    mongoAuthProvider,
    'derived'
  ) ?? 'derived';

  const services = buildProviderServiceStatuses({
    appConfigured,
    appConfiguredSource,
    appEffective,
    authConfigured,
    authConfiguredSource,
  });

  const warnings = hasMongoUri ? [] : ['MONGODB_URI is missing.'];
  const payload: AppProviderDiagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: false,
      hasMongoUri,
      appDbProviderEnv,
    },
    services,
    driftCount: services.filter((status) => status.driftFromApp).length,
    warningCount: warnings.length,
    warnings,
  };

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

export async function postDatabaseSyncHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  return NextResponse.json(
    {
      success: false,
      error:
        'Database sync is no longer supported. MongoDB is the only active database provider.',
    },
    { status: 400 }
  );
}

export async function postBackfillKeysHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const parsed = await parseJsonBody(req, settingsBackfillRequestSchema, {
    logPrefix: 'database-engine.settings.migrate.backfill-keys.POST',
  });
  if (!parsed.ok) return parsed.response;

  await assertDatabaseEngineOperationEnabled('allowManualBackfill');

  const enginePolicy = await getDatabaseEnginePolicy();
  const isManual = parsed.data.manual === true;
  if (!enginePolicy.allowAutomaticBackfill && !isManual) {
    throw badRequestError(
      'Automatic backfill is disabled by Database Engine policy. Run backfill manually from Database Engine.'
    );
  }

  if (!hasMongoDatabaseUrl()) {
    throw internalError('MongoDB is not configured.');
  }

  const limit = parsed.data.limit ?? 500;
  const isDryRun = parsed.data.dryRun === true;
  const filter: Filter<{ _id: string; key?: string | null }> = {
    $and: [
      { _id: { $type: 'string' as const } },
      {
        $or: [{ key: { $exists: false } }, { key: null }, { key: '' }],
      },
    ],
  };

  const mongo = await getMongoDb();
  const collection = mongo.collection<{ _id: string; key?: string | null }>(SETTINGS_COLLECTION);

  const result = isDryRun
    ? await runBackfillDryRun(collection, filter)
    : await runBackfillUpdate(collection, filter, limit);

  return NextResponse.json(result satisfies SettingsBackfillResult);
}
