/**
 * Collection Provider Map
 * 
 * Manages the routing of individual MongoDB collections to specific database providers.
 * Features:
 * - Dynamic collection-to-provider mapping (MongoDB or Redis)
 * - Database Engine policy-aware provider resolution
 * - Automated fallback to application-wide database provider
 * - Server-only execution for security and performance
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
 * Cache TTL for collection routing maps.
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
 * Parses a raw value into a collection routing map.
 * 
 * @param raw - The raw value from database settings.
 * @returns A validated Record of collection names to providers.
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
 * Finds an explicit route for a collection in the map, supporting case-insensitive matching.
 * 
 * @param map - The routing map.
 * @param collectionName - The name of the collection to route.
 * @returns The matched provider or undefined if no explicit route exists.
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
 * Reads a routing map from MongoDB settings.
 * 
 * @param key - The settings key.
 * @returns The parsed routing map.
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
 * Internal helper to read the collection route map from settings.
 */
const readCollectionRouteMap = async (): Promise<Record<string, DatabaseEngineProvider>> => {
  return readMapFromMongo(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
};

/**
 * Returns the full per-collection routing map.
 * This map includes all explicitly routed collections and their target providers (mongodb or redis).
 * 
 * @returns Full collection routing map.
 */
export async function getCollectionRouteMap(): Promise<Record<string, DatabaseEngineProvider>> {
  return collectionRouteMapCache.get(async () => {
    return readCollectionRouteMap();
  });
}

/**
 * Returns a map of collections specifically routed to MongoDB.
 * Useful for operations that only support primary application databases.
 * 
 * @returns Collection map for MongoDB providers.
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
 * Resolves the database provider for a specific collection.
 * 
 * Logic flow:
 * 1. Check for explicit route in Database Engine.
 * 2. If routed to MongoDB, return 'mongodb'.
 * 3. If routed to Redis, throw if MongoDB is required (this function currently assumes MongoDB context).
 * 4. If no explicit route, check Database Engine policy:
 *    - If policy requires explicit routing, throw.
 *    - Otherwise, fallback to the app-wide provider.
 * 
 * @param collectionName - The name of the collection.
 * @returns The resolved AppDbProvider for the collection.
 * @throws {InternalError} If routing violates policy or targets an incompatible provider.
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
  if (policy.requireExplicitCollectionRouting) {
    throw internalError(
      `Collection "${collectionName}" has no explicit route in Database Engine and explicit collection routing is required.`
    );
  }
  return getAppDbProvider();
}

/**
 * Represents the requested provider selection for a database operation.
 */
export type CollectionProviderSelection = 'auto' | AppDbProvider | undefined;

/**
 * Resolves the final provider for a request based on a preferred selection and collection routing.
 * 
 * @param collectionName - The name of the collection being accessed.
 * @param requestedProvider - The user/system requested provider override.
 * @returns The resolved AppDbProvider.
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
 * Invalidates the cached collection provider routing map.
 */
export const invalidateCollectionProviderMapCache = (): void => {
  collectionRouteMapCache.invalidate();
};

