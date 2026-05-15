/**
 * Database Engine Policy
 * 
 * Central management service for the Database Engine, providing dynamic runtime
 * configuration for database access, service routing, and maintenance policies.
 * 
 * Architecture:
 * - Policy Definitions: Governs operational constraints (e.g., routing strictness, 
 *   automatic migration/backfill allowances).
 * - Multi-tenant Routing: Manages mappings for both service-level (e.g., 'auth', 'cms') 
 *   and collection-level routing, allowing the system to direct traffic between 
 *   different providers (MongoDB or Redis).
 * - Caching: Leverages `SafeDatabaseCache` to store configurations fetched from the 
 *   'settings' MongoDB collection, minimizing database pressure during frequent policy checks.
 * - Resilience: Implements observability-instrumented error reporting, ensuring 
 *   that failures in configuration loading or parsing are logged for system monitoring.
 */

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';

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
import { SafeDatabaseCache } from './utils/database-cache';

/**
 * Reads a positive integer from environment variables with a fallback value.
 */
const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

/**
 * Cache TTL for Database Engine policies, configurable via environment.
 */
const CACHE_TTL_MS = readPositiveIntegerEnv('DATABASE_ENGINE_POLICY_CACHE_TTL_MS', 10 * 60_000);

/** Cache for global database policies. */
const policyCache = new SafeDatabaseCache<DatabaseEnginePolicy>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.database-engine-policy',
  action: 'getDatabaseEnginePolicy',
  defaultValue: DEFAULT_DATABASE_ENGINE_POLICY,
});

/** Cache for service-level routing maps. */
const serviceRouteMapCache = new SafeDatabaseCache<
  Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.database-engine-policy',
  action: 'getDatabaseEngineServiceRouteMap',
  defaultValue: {},
});

/** Cache for collection-level routing maps. */
const collectionRouteMapCache = new SafeDatabaseCache<Record<string, DatabaseEngineProvider>>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.database-engine-policy',
  action: 'getDatabaseEngineCollectionRouteMap',
  defaultValue: {},
});

/** Cache for backup schedules. */
const backupScheduleCache = new SafeDatabaseCache<DatabaseEngineBackupSchedule>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.database-engine-policy',
  action: 'getDatabaseEngineBackupSchedule',
});

/** Cache for operation controls. */
const operationControlsCache = new SafeDatabaseCache<DatabaseEngineOperationControls>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.database-engine-policy',
  action: 'getDatabaseEngineOperationControls',
  defaultValue: DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
});

/** Validates if a string is a recognized database provider. */
const isValidProvider = (value: string): value is DatabaseEngineProvider =>
  value === 'mongodb' || value === 'redis';

/** Validates if a string is a recognized service route. */
const isValidServiceRoute = (value: string): value is DatabaseEngineServiceRoute =>
  value === 'app' ||
  value === 'auth' ||
  value === 'product' ||
  value === 'integrations' ||
  value === 'cms';

/** 
 * Safely parses raw configuration settings from the database into a plain object.
 * Returns null if the provided input is invalid or not a valid JSON-serializable object.
 */
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

/** 
 * Normalizes raw settings data into a strict `DatabaseEnginePolicy` object.
 * Enforces default settings for missing or malformed configuration fields.
 */
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

/** 
 * Parses raw settings into a mapping of services to specific database providers.
 * Filters out invalid services or provider types to maintain configuration integrity.
 */
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

/** 
 * Parses raw settings into a mapping of collections to specific database providers.
 * Sanitizes keys/values to match the expected schema.
 */
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

/** Parses raw settings into a `DatabaseEngineBackupSchedule` definition. */
const parseBackupSchedule = (raw: unknown): DatabaseEngineBackupSchedule =>
  normalizeDatabaseEngineBackupSchedule(raw);

/** Parses raw settings into `DatabaseEngineOperationControls` definitions. */
const parseOperationControls = (raw: unknown): DatabaseEngineOperationControls =>
  normalizeDatabaseEngineOperationControls(raw);

/**
 * Low-level utility for reading a string setting from the MongoDB settings store.
 * Ensures the database source is properly initialized before query execution.
 */
const readMongoSetting = async (key: string): Promise<string | null> => {
  await applyActiveMongoSourceEnv();
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

/** Resolves a settings value. */
const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

/**
 * Retrieves the active `DatabaseEnginePolicy` from the cached store.
 */
/**
 * getDatabaseEnginePolicy: Retrieves the global Database Engine policy configuration, 
 * using cached settings from the database where possible.
 * 
 * @returns The active DatabaseEnginePolicy.
 */
export async function getDatabaseEnginePolicy(): Promise<DatabaseEnginePolicy> {
  return policyCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_POLICY_KEY);
    return parsePolicy(raw);
  });
}

/**
 * Retrieves the current service-level routing map from the cached store.
 */
export async function getDatabaseEngineServiceRouteMap(): Promise<
  Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>>
> {
  return serviceRouteMapCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY);
    return parseServiceRouteMap(raw);
  });
}

/**
 * Retrieves the current collection-level routing map from the cached store.
 */
export async function getDatabaseEngineCollectionRouteMap(): Promise<
  Record<string, DatabaseEngineProvider>
> {
  return collectionRouteMapCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
    return parseCollectionRouteMap(raw);
  });
}

/**
 * Retrieves the current backup schedule from the cached store.
 */
/**
 * getDatabaseEngineBackupSchedule: Retrieves the configured backup schedule for all targets.
 * 
 * @returns The DatabaseEngineBackupSchedule record.
 */
export async function getDatabaseEngineBackupSchedule(): Promise<DatabaseEngineBackupSchedule> {
  return backupScheduleCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY);
    return parseBackupSchedule(raw);
  });
}

/**
 * Retrieves the current operational controls from the cached store.
 */
/**
 * getDatabaseEngineOperationControls: Retrieves the current manual operation control flags.
 * 
 * @returns The DatabaseEngineOperationControls configuration.
 */
export async function getDatabaseEngineOperationControls(): Promise<DatabaseEngineOperationControls> {
  return operationControlsCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_OPERATION_CONTROLS_KEY);
    if (!raw) return { ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS };
    return parseOperationControls(raw);
  });
}

/**
 * Resolves the configured provider for a given service (e.g., 'auth' -> 'mongodb').
 * Returns null if no explicit route exists, leaving resolution to the caller.
 */
/**
 * getDatabaseEngineServiceProvider: Resolves the database provider (e.g., 'mongodb' or 'redis')
 * for a specific engine service, considering routing maps and fallback policies.
 * 
 * @param service - The service route identifier (e.g., 'auth', 'cms').
 * @returns The assigned DatabaseEngineProvider, or undefined if no specific route exists.
 */
export async function getDatabaseEngineServiceProvider(
  service: DatabaseEngineServiceRoute
): Promise<DatabaseEngineProvider | undefined> {
  const map = await getDatabaseEngineServiceRouteMap();
  return map[service] ?? null;
}

/** Checks if a primary database provider is correctly configured in the environment. */
export const isPrimaryProviderConfigured = (provider: DatabaseEnginePrimaryProvider): boolean =>
  provider === 'mongodb' ? Boolean(process.env['MONGODB_URI']) : false;

/** Checks if the Redis provider is available in the environment. */
export const isRedisProviderConfigured = (): boolean => Boolean(process.env['REDIS_URL']);

/**
 * Forces invalidation of all cached database engine configurations. 
 * Use this after administrative updates to database settings.
 */
export const invalidateDatabaseEnginePolicyCache = (): void => {
  policyCache.invalidate();
  serviceRouteMapCache.invalidate();
  collectionRouteMapCache.invalidate();
  backupScheduleCache.invalidate();
  operationControlsCache.invalidate();
};

