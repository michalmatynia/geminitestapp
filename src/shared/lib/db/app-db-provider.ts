/**
 * App Database Provider
 * 
 * Manages the resolution and caching of the primary application database provider.
 * This module handles:
 * - Environment-based provider overrides
 * - Database-backed provider settings
 * - Database Engine policy-based routing
 * - Multi-level caching for performance
 */

import type { AppProviderValue as AppDbProvider } from '@/shared/contracts/system';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';

import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from './database-engine-policy';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';
import { SafeDatabaseCache } from './utils/database-cache';

/**
 * The database key used to store the application database provider setting.
 */
export const APP_DB_PROVIDER_SETTING_KEY = 'app_db_provider';

export type { AppDbProvider };

/**
 * Reads a positive integer from environment variables with a fallback value.
 * 
 * @param key - The environment variable key.
 * @param fallback - The value to return if the environment variable is missing or invalid.
 * @returns The parsed positive integer or fallback.
 */
const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

/**
 * TTL for the provider setting cache, configurable via environment.
 */
const PROVIDER_CACHE_TTL_MS = readPositiveIntegerEnv('APP_DB_PROVIDER_CACHE_TTL_MS', 5 * 60_000);

/**
 * Cache for the raw provider setting retrieved from the database.
 */
const providerSettingCache = new SafeDatabaseCache<AppDbProvider | null>({
  ttlMs: PROVIDER_CACHE_TTL_MS,
  source: 'db.app-db-provider',
  action: 'getAppDbProviderSetting',
});

/**
 * Cache for the final resolved provider, accounting for policies and environment.
 */
const resolvedProviderCache = new SafeDatabaseCache<AppDbProvider>({
  ttlMs: 60000, // 60 seconds
  source: 'db.app-db-provider',
  action: 'getAppDbProvider',
});

/**
 * Normalizes a provider string to a valid AppDbProvider value.
 * Currently only 'mongodb' is supported as a primary application database.
 * 
 * @param value - The raw provider string.
 * @returns Normalized AppDbProvider or null if invalid/unsupported.
 */
const normalizeProvider = (value?: string | null): AppDbProvider | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'mongodb') return 'mongodb';
  return null;
};

/**
 * Directly reads the application database provider setting from MongoDB.
 * 
 * @returns The configured provider or null.
 * @sideEffect Triggers MongoDB connection and environment application.
 */
const readMongoAppProviderSetting = async (): Promise<AppDbProvider | null> => {
  await applyActiveMongoSourceEnv();
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [{ _id: APP_DB_PROVIDER_SETTING_KEY }, { key: APP_DB_PROVIDER_SETTING_KEY }],
      });
    return normalizeProvider(doc?.value ?? null);
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.app-db-provider',
      action: 'readMongoAppProviderSetting',
      settingKey: APP_DB_PROVIDER_SETTING_KEY,
    });
    return null;
  }
};

/**
 * Retrieves the application database provider setting, preferring environment overrides.
 * Results are cached based on PROVIDER_CACHE_TTL_MS.
 * 
 * @returns The configured provider setting or null.
 */
export const getAppDbProviderSetting = async (): Promise<AppDbProvider | null> => {
  return providerSettingCache.get(async () => {
    await applyActiveMongoSourceEnv();
    if (process.env['APP_DB_PROVIDER']) {
      const envProvider = normalizeProvider(process.env['APP_DB_PROVIDER']);
      if (envProvider) return envProvider;
    }
    return readMongoAppProviderSetting();
  });
};

/**
 * Resolves the final application database provider by evaluating:
 * 1. Database Engine service routing ('app' service).
 * 2. Database Engine policy requirements.
 * 3. Configured application settings (database or environment).
 * 
 * @returns The resolved AppDbProvider.
 * @throws {InternalError} If no provider is configured, or if routing/policy constraints are violated.
 */
export const getAppDbProvider = async (): Promise<AppDbProvider> => {
  return resolvedProviderCache.get(async () => {
    await applyActiveMongoSourceEnv();

    const [policy, routeProvider] = await Promise.all([
      getDatabaseEnginePolicy(),
      getDatabaseEngineServiceProvider('app'),
    ]);
    let result: AppDbProvider;

    // Explicit service routing in Database Engine takes precedence.
    if (routeProvider) {
      if (routeProvider === 'redis') {
        throw internalError('Database Engine route "app" cannot target Redis. Use MongoDB.');
      }
      if (routeProvider !== 'mongodb') {
        throw internalError(
          `Database Engine route "app" targets "${routeProvider}" but only MongoDB is supported.`
        );
      }
      if (!isPrimaryProviderConfigured(routeProvider)) {
        throw internalError(
          `Database Engine route "app" targets "${routeProvider}" but it is not configured in environment variables.`
        );
      }
      result = routeProvider;
    } else if (policy.requireExplicitServiceRouting) {
      // If policy requires explicit routing but none is found, we must error.
      throw internalError(
        'Database Engine requires explicit service routing for "app". Configure it in Workflow Database -> Database Engine.'
      );
    } else {
      // Fallback to legacy settings and direct MONGODB_URI check.
      const setting = await getAppDbProviderSetting();
      if (setting === 'mongodb' || process.env['MONGODB_URI']) {
        if (!process.env['MONGODB_URI']) {
          throw internalError('App provider is set to MongoDB but MONGODB_URI is missing.');
        }
        result = 'mongodb';
      } else {
        throw internalError('No database provider is configured. Set MONGODB_URI.');
      }
    }

    return result;
  });
};

/**
 * Invalidates all cached provider settings and resolved values.
 * Should be called when database settings or policies change.
 */
export const invalidateAppDbProviderCache = (): void => {
  providerSettingCache.invalidate();
  resolvedProviderCache.invalidate();
};

