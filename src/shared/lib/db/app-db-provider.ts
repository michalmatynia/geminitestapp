/**
 * App Database Provider Service
 * 
 * This module is the central authority for resolving the primary application database 
 * provider (e.g., MongoDB, Redis). It manages provider discovery, routing based on 
 * system policy, and efficient caching to ensure high-performance database operations.
 * 
 * Features:
 * - Provider Resolution: Dynamically resolves the active database provider based on 
 *   environment configuration, persistent settings, and internal engine policies.
 * - Multi-level Routing: Integrates with `database-engine-policy.ts` to support 
 *   service-level or collection-level database routing.
 * - Caching: Implements a TTL-based cache to minimize expensive provider-resolution 
 *   lookups.
 * - Runtime Safety: Provides fallbacks and error handling to ensure consistent 
 *   database availability even when specific configurations might be missing.
 * 
 * Usage:
 * Use this service to identify the correct client or connection context for 
 * database operations. It should be used at the start of any database-dependent 
 * flow to ensure requests are routed to the current operational provider.
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
 * Constant key used for retrieving the application database provider setting 
 * from the persistent settings registry.
 */
export const APP_DB_PROVIDER_SETTING_KEY = 'app_db_provider';

export type { AppDbProvider };

/**
 * Reads a positive integer from environment variables with a fallback value.
 * Used for service-level configuration parameters.
 * 
 * @param key - The environment variable key.
 * @param fallback - The default value if the env var is missing or invalid.
 * @returns The parsed positive integer or the provided fallback.
 */
const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

/**
 * TTL (Time-to-Live) for the provider setting cache, configurable via environment.
 * Defaults to 5 minutes to balance consistency and performance.
 */
const PROVIDER_CACHE_TTL_MS = readPositiveIntegerEnv('APP_DB_PROVIDER_CACHE_TTL_MS', 5 * 60_000);
// ... (rest of file remains same)
