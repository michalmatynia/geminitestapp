import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { normalizeDatabaseEngineBackupSchedule } from './database-engine-backup-schedule';
import {
  DATABASE_ENGINE_POLICY_KEY,
  DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY,
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  DATABASE_ENGINE_BACKUP_SCHEDULE_KEY,
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DEFAULT_DATABASE_ENGINE_POLICY,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  type DatabaseEnginePolicy,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineOperationControls,
  type DatabaseEngineProvider,
  type DatabaseEnginePrimaryProvider,
  type DatabaseEngineServiceRoute,
} from './database-engine-constants';
import { normalizeDatabaseEngineOperationControls } from './database-engine-operation-controls';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';


const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const CACHE_TTL_MS = readPositiveIntegerEnv('DATABASE_ENGINE_POLICY_CACHE_TTL_MS', 5 * 60_000);

type CachedValue<T> = { value: T; ts: number };

let policyCache: CachedValue<DatabaseEnginePolicy> | null = null;
let policyInflight: Promise<DatabaseEnginePolicy> | null = null;

let serviceRouteMapCache: CachedValue<
  Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
> | null = null;
let serviceRouteMapInflight: Promise<
  Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
> | null = null;

let collectionRouteMapCache: CachedValue<Record<string, DatabaseEngineProvider>> | null = null;
let collectionRouteMapInflight: Promise<Record<string, DatabaseEngineProvider>> | null = null;

let backupScheduleCache: CachedValue<DatabaseEngineBackupSchedule> | null = null;
let backupScheduleInflight: Promise<DatabaseEngineBackupSchedule> | null = null;

let operationControlsCache: CachedValue<DatabaseEngineOperationControls> | null = null;
let operationControlsInflight: Promise<DatabaseEngineOperationControls> | null = null;

const isValidProvider = (value: string): value is DatabaseEngineProvider =>
  value === 'mongodb' || value === 'redis';

const isValidServiceRoute = (value: string): value is DatabaseEngineServiceRoute =>
  value === 'app' ||
  value === 'auth' ||
  value === 'product' ||
  value === 'integrations' ||
  value === 'cms';

const parseJsonObject = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.database-engine-policy',
      action: 'parseJsonObject',
      rawType: typeof raw,
    });
    return null;
  }
};

const parsePolicy = (raw: unknown): DatabaseEnginePolicy => {
  const parsed = parseJsonObject(raw);
  if (!parsed) return { ...DEFAULT_DATABASE_ENGINE_POLICY };

  const boolOrDefault = (key: keyof DatabaseEnginePolicy): boolean =>
    typeof parsed[key] === 'boolean' ? Boolean(parsed[key]) : DEFAULT_DATABASE_ENGINE_POLICY[key];

  return {
    requireExplicitServiceRouting: boolOrDefault('requireExplicitServiceRouting'),
    requireExplicitCollectionRouting: boolOrDefault('requireExplicitCollectionRouting'),
    allowAutomaticFallback: boolOrDefault('allowAutomaticFallback'),
    allowAutomaticBackfill: boolOrDefault('allowAutomaticBackfill'),
    allowAutomaticMigrations: boolOrDefault('allowAutomaticMigrations'),
    strictProviderAvailability: boolOrDefault('strictProviderAvailability'),
  };
};

const parseServiceRouteMap = (
  raw: unknown
): Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> => {
  const parsed = parseJsonObject(raw);
  if (!parsed) return {};
  const result: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> = {};
  for (const [service, provider] of Object.entries(parsed)) {
    if (!isValidServiceRoute(service) || typeof provider !== 'string') continue;
    if (isValidProvider(provider)) {
      result[service] = provider;
    }
  }
  return result;
};

const parseCollectionRouteMap = (raw: unknown): Record<string, DatabaseEngineProvider> => {
  const parsed = parseJsonObject(raw);
  if (!parsed) return {};
  const result: Record<string, DatabaseEngineProvider> = {};
  for (const [collection, provider] of Object.entries(parsed)) {
    if (typeof collection !== 'string' || typeof provider !== 'string') continue;
    if (isValidProvider(provider)) {
      result[collection] = provider;
    }
  }
  return result;
};

const parseBackupSchedule = (raw: unknown): DatabaseEngineBackupSchedule =>
  normalizeDatabaseEngineBackupSchedule(raw);

const parseOperationControls = (raw: unknown): DatabaseEngineOperationControls =>
  normalizeDatabaseEngineOperationControls(raw);

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [{ _id: key }, { key }],
      });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.database-engine-policy',
      action: 'readMongoSetting',
      settingKey: key,
    });
    return null;
  }
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

export async function getDatabaseEnginePolicy(): Promise<DatabaseEnginePolicy> {
  const now = Date.now();
  if (policyCache && now - policyCache.ts < CACHE_TTL_MS) {
    return policyCache.value;
  }
  if (policyInflight) {
    return policyInflight;
  }

  policyInflight = (async (): Promise<DatabaseEnginePolicy> => {
    const raw = await readSettingValue(DATABASE_ENGINE_POLICY_KEY);
    return parsePolicy(raw);
  })();

  try {
    const value = await policyInflight;
    policyCache = { value, ts: Date.now() };
    return value;
  } finally {
    policyInflight = null;
  }
}

export async function getDatabaseEngineServiceRouteMap(): Promise<
  Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
  > {
  const now = Date.now();
  if (serviceRouteMapCache && now - serviceRouteMapCache.ts < CACHE_TTL_MS) {
    return serviceRouteMapCache.value;
  }
  if (serviceRouteMapInflight) {
    return serviceRouteMapInflight;
  }

  serviceRouteMapInflight = (async (): Promise<
    Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
  > => {
    const raw = await readSettingValue(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY);
    return parseServiceRouteMap(raw);
  })();

  try {
    const value = await serviceRouteMapInflight;
    serviceRouteMapCache = { value, ts: Date.now() };
    return value;
  } finally {
    serviceRouteMapInflight = null;
  }
}

export async function getDatabaseEngineCollectionRouteMap(): Promise<
  Record<string, DatabaseEngineProvider>
  > {
  const now = Date.now();
  if (collectionRouteMapCache && now - collectionRouteMapCache.ts < CACHE_TTL_MS) {
    return collectionRouteMapCache.value;
  }
  if (collectionRouteMapInflight) {
    return collectionRouteMapInflight;
  }

  collectionRouteMapInflight = (async (): Promise<Record<string, DatabaseEngineProvider>> => {
    const raw = await readSettingValue(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
    return parseCollectionRouteMap(raw);
  })();

  try {
    const value = await collectionRouteMapInflight;
    collectionRouteMapCache = { value, ts: Date.now() };
    return value;
  } finally {
    collectionRouteMapInflight = null;
  }
}

export async function getDatabaseEngineBackupSchedule(): Promise<DatabaseEngineBackupSchedule> {
  const now = Date.now();
  if (backupScheduleCache && now - backupScheduleCache.ts < CACHE_TTL_MS) {
    return backupScheduleCache.value;
  }
  if (backupScheduleInflight) {
    return backupScheduleInflight;
  }

  backupScheduleInflight = (async (): Promise<DatabaseEngineBackupSchedule> => {
    const raw = await readSettingValue(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY);
    return parseBackupSchedule(raw);
  })();

  try {
    const value = await backupScheduleInflight;
    backupScheduleCache = { value, ts: Date.now() };
    return value;
  } finally {
    backupScheduleInflight = null;
  }
}

export async function getDatabaseEngineOperationControls(): Promise<DatabaseEngineOperationControls> {
  const now = Date.now();
  if (operationControlsCache && now - operationControlsCache.ts < CACHE_TTL_MS) {
    return operationControlsCache.value;
  }
  if (operationControlsInflight) {
    return operationControlsInflight;
  }

  operationControlsInflight = (async (): Promise<DatabaseEngineOperationControls> => {
    const raw = await readSettingValue(DATABASE_ENGINE_OPERATION_CONTROLS_KEY);
    if (!raw) return { ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS };
    return parseOperationControls(raw);
  })();

  try {
    const value = await operationControlsInflight;
    operationControlsCache = { value, ts: Date.now() };
    return value;
  } finally {
    operationControlsInflight = null;
  }
}

export async function getDatabaseEngineServiceProvider(
  service: DatabaseEngineServiceRoute
): Promise<DatabaseEngineProvider | null> {
  const map = await getDatabaseEngineServiceRouteMap();
  return map[service] ?? null;
}

export const isPrimaryProviderConfigured = (provider: DatabaseEnginePrimaryProvider): boolean =>
  provider === 'mongodb' ? Boolean(process.env['MONGODB_URI']) : false;

export const isRedisProviderConfigured = (): boolean => Boolean(process.env['REDIS_URL']);

export const invalidateDatabaseEnginePolicyCache = (): void => {
  policyCache = null;
  policyInflight = null;
  serviceRouteMapCache = null;
  serviceRouteMapInflight = null;
  collectionRouteMapCache = null;
  collectionRouteMapInflight = null;
  backupScheduleCache = null;
  backupScheduleInflight = null;
  operationControlsCache = null;
  operationControlsInflight = null;
};
