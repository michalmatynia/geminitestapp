/**
 * Collection Provider Map
 * 
 * Centralized service for dynamic routing of database collections to specific providers.
 * 
 * Architecture:
 * 1. Policy-Based Routing: Supports multi-tenancy and per-service isolation by 
 *    mapping specific collection names to either 'mongodb' or 'redis'.
 * 2. Database Engine Policy: Integrates with `getDatabaseEnginePolicy` to determine
 *    if implicit routing (falling back to the app-wide provider) is allowed.
 * 3. Caching: Uses a `SafeDatabaseCache` with a 30s TTL, as routing definitions 
 *    are fetched from the database settings collection.
 * 
 * Usage:
 * - Applications query this service via `getCollectionProvider` to ensure 
 *   database operations (like CRUD) target the correct underlying infrastructure.
 */

import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';

import { getAppDbProvider, type AppDbProvider } from './app-db-provider';
import {
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  type DatabaseEngineProvider,
} from './database-engine-constants';
import { getDatabaseEnginePolicy } from './database-engine-policy';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';
import { SafeDatabaseCache } from './utils/database-cache';

/**
 * Cache TTL in milliseconds for the collection-to-provider routing map.
 */
const CACHE_TTL_MS = 30_000;

/**
 * Internal cache for the collection routing map.
 */
const collectionRouteMapCache = new SafeDatabaseCache<Record<string, DatabaseEngineProvider>>({
  ttlMs: CACHE_TTL_MS,
  source: 'db.collection-provider-map',
  action: 'getCollectionRouteMap',
  defaultValue: {},
});

/**
 * Converts a raw, potentially unparsed setting (like a JSON string) into 
 * a reliable Record mapping collection names to provider types.
 * 
 * @param raw - The raw, unparsed routing data from settings.
 * @returns A validated Record where keys are collection names and values 
 *          are the target DatabaseEngineProvider.
 */
const parseMap = (raw: unknown): Record<string, DatabaseEngineProvider> => {
  if (!raw) return {};
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(str) as Record<string, string>;
    const result: Record<string, DatabaseEngineProvider> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 'mongodb' || value === 'redis') {
        result[key] = value;
      }
    }
    return result;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.collection-provider-map',
      action: 'parseMap',
    });
    return {};
  }
};

/**
 * Performs a lookup for a specific collection route within the provided map.
 * 
 * Performs case-insensitive matching by normalizing keys to lowercase 
 * for more resilient routing.
 * 
 * @param map - The active routing map fetched from settings.
 * @param collectionName - The target collection name.
 * @returns The target provider type if a match is found, otherwise undefined.
 */
const findCollectionRoute = (
  map: Record<string, DatabaseEngineProvider>,
  collectionName: string
): DatabaseEngineProvider | undefined => {
  const direct = map[collectionName];
  if (direct) return direct;
  const normalized = collectionName.trim().toLowerCase();
  if (!normalized) return undefined;
  const matchedKey = Object.keys(map).find((key) => key.trim().toLowerCase() === normalized);
  return matchedKey ? map[matchedKey] : undefined;
};

/**
 * Retrieves the raw routing map from the 'settings' MongoDB collection.
 * 
 * @param key - The settings key used for lookup in the Mongo collection.
 * @returns Parsed routing configuration.
 */
const readMapFromMongo = async (key: string): Promise<Record<string, DatabaseEngineProvider>> => {
  await applyActiveMongoSourceEnv();
  if (!process.env['MONGODB_URI']) return {};
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [{ _id: key }, { key }],
      });
    return parseMap(doc?.value);
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.collection-provider-map',
      action: 'readMapFromMongo',
      settingKey: key,
    });
    return {};
  }
};

/**
 * Private helper triggered by the cache manager to refresh routing settings.
 */
const readCollectionRouteMap = async (): Promise<Record<string, DatabaseEngineProvider>> => {
  return readMapFromMongo(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
};

/**
 * Returns the full per-collection routing map.
 * This map includes all explicitly routed collections and their target providers.
 */
export async function getCollectionRouteMap(): Promise<Record<string, DatabaseEngineProvider>> {
  return collectionRouteMapCache.get(async () => {
    return readCollectionRouteMap();
  });
}

/**
 * Returns a subset map containing only collections explicitly routed to MongoDB.
 */
export async function getCollectionProviderMap(): Promise<Record<string, AppDbProvider>> {
  const routeMap = await getCollectionRouteMap();
  const primaryMap: Record<string, AppDbProvider> = {};
  for (const [collection, provider] of Object.entries(routeMap)) {
    if (provider === 'mongodb') {
      primaryMap[collection] = provider;
    }
  }
  return primaryMap;
}

/**
 * Orchestrates provider resolution for a specific collection.
 * 
 * Resolves the provider by prioritizing explicit overrides, then checking
 * if the database policy mandates an explicit route, and finally falling
 * back to the default database provider.
 * 
 * @param collectionName - Target collection.
 * @returns The resolved AppDbProvider for the request context.
 * @throws {InternalError} If routing violates current policy (e.g., target Redis 
 *         while MongoDB is required, or no route provided under strict policies).
 */
export async function getCollectionProvider(collectionName: string): Promise<AppDbProvider> {
  const policy = await getDatabaseEnginePolicy();
  const map = await getCollectionRouteMap();
  const explicit = findCollectionRoute(map, collectionName);
  
  if (explicit === 'mongodb') return explicit;
  if (explicit === 'redis') {
    throw internalError(
      `Collection "${collectionName}" is routed to Redis, but this code path requires MongoDB.`
    );
  }
  
  // Enforce Database Engine routing policy.
  if (policy.requireExplicitCollectionRouting) {
    throw internalError(
      `Collection "${collectionName}" has no explicit route in Database Engine and explicit collection routing is required.`
    );
  }
  
  return getAppDbProvider();
}

/**
 * Represents the requested provider selection for a database operation.
 * Can be 'auto' (the service determines the route), a specific AppDbProvider,
 * or undefined (fallback logic applies).
 */
export type CollectionProviderSelection = 'auto' | AppDbProvider | undefined;

/**
 * Resolves the final database provider, allowing for system-level overrides.
 * 
 * @param collectionName - Target collection.
 * @param requestedProvider - User or system-specified preference.
 * @returns The definitive provider for this operation.
 */
export async function resolveCollectionProviderForRequest(
  collectionName: string,
  requestedProvider: CollectionProviderSelection
): Promise<AppDbProvider> {
  if (requestedProvider === 'mongodb') {
    return requestedProvider;
  }
  return getCollectionProvider(collectionName);
}

/**
 * Manually invalidates the collection provider routing map, forcing a refresh 
 * on the next request. Used during configuration updates.
 */
export const invalidateCollectionProviderMapCache = (): void => {
  collectionRouteMapCache.invalidate();
};

