/**
 * Database Engine Policy
 * 
 * Central manager for Database Engine policies, service routing, and backup schedules.
 * This module handles:
 * - Retrieving and parsing global database engine policies.
 * - Managing service-to-provider and collection-to-provider routing maps.
 * - Providing normalized backup schedules and operational controls.
 * - Caching of all database engine configurations with configurable TTLs.
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

/** Parses a raw value into a plain object Record from JSON. */
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

/** Normalizes raw input into a DatabaseEnginePolicy. */
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

/** Parses raw input into a service routing map. */
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

/** Parses raw input into a collection routing map. */
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

/** Parses raw input into a backup schedule. */
const parseBackupSchedule = (raw: unknown): DatabaseEngineBackupSchedule =>
  normalizeDatabaseEngineBackupSchedule(raw);

/** Parses raw input into operation controls. */
const parseOperationControls = (raw: unknown): DatabaseEngineOperationControls =>
  normalizeDatabaseEngineOperationControls(raw);

/** Directly reads a settings value from MongoDB. */
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

/** Reads a setting value, currently defaulting to MongoDB settings. */
const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

/**
 * Retrieves the global Database Engine policy.
 * @returns The active DatabaseEnginePolicy.
 */
export async function getDatabaseEnginePolicy(): Promise<DatabaseEnginePolicy> {
  return policyCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_POLICY_KEY);
    return parsePolicy(raw);
  });
}

/**
 * Retrieves the service-to-provider routing map.
 * @returns A partial record of service routes to providers.
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
 * Retrieves the collection-to-provider routing map.
 * @returns A record of collection names to providers.
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
 * Retrieves the normalized backup schedule.
 * @returns The DatabaseEngineBackupSchedule.
 */
export async function getDatabaseEngineBackupSchedule(): Promise<DatabaseEngineBackupSchedule> {
  return backupScheduleCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_BACKUP_SCHEDULE_KEY);
    return parseBackupSchedule(raw);
  });
}

/**
 * Retrieves the normalized operation controls.
 * @returns The DatabaseEngineOperationControls.
 */
export async function getDatabaseEngineOperationControls(): Promise<DatabaseEngineOperationControls> {
  return operationControlsCache.get(async () => {
    const raw = await readSettingValue(DATABASE_ENGINE_OPERATION_CONTROLS_KEY);
    if (!raw) return { ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS };
    return parseOperationControls(raw);
  });
}

/**
 * Resolves the configured provider for a specific service route.
 * 
 * @param service - The service route (e.g., 'auth', 'cms').
 * @returns The resolved provider or null if no explicit route is configured.
 */
export async function getDatabaseEngineServiceProvider(
  service: DatabaseEngineServiceRoute
): Promise<DatabaseEngineProvider | null> {
  const map = await getDatabaseEngineServiceRouteMap();
  return map[service] ?? null;
}

/**
 * Checks if a primary database provider (like MongoDB) is correctly configured in the environment.
 * 
 * @param provider - The primary provider to check.
 * @returns True if configured.
 */
export const isPrimaryProviderConfigured = (provider: DatabaseEnginePrimaryProvider): boolean =>
  provider === 'mongodb' ? Boolean(process.env['MONGODB_URI']) : false;

/** Checks if the Redis provider is configured in the environment. */
export const isRedisProviderConfigured = (): boolean => Boolean(process.env['REDIS_URL']);

/**
 * Invalidates all caches for database engine policies and routes.
 */
export const invalidateDatabaseEnginePolicyCache = (): void => {
  policyCache.invalidate();
  serviceRouteMapCache.invalidate();
  collectionRouteMapCache.invalidate();
  backupScheduleCache.invalidate();
  operationControlsCache.invalidate();
};

