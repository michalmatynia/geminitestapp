import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { getAppDbProvider, type AppDbProvider } from './app-db-provider';
import {
  DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY,
  type DatabaseEngineProvider,
} from './database-engine-constants';
import { getDatabaseEnginePolicy } from './database-engine-policy';

const CACHE_TTL_MS = 30_000;
let mapCache: { value: Record<string, DatabaseEngineProvider>; ts: number } | null = null;
let mapInflight: Promise<Record<string, DatabaseEngineProvider>> | null = null;

const parseMap = (raw: unknown): Record<string, DatabaseEngineProvider> => {
  if (!raw) return {};
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(str) as Record<string, string>;
    const result: Record<string, DatabaseEngineProvider> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 'mongodb' || value === 'prisma' || value === 'redis') {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
};

const findCollectionRoute = (
  map: Record<string, DatabaseEngineProvider>,
  collectionName: string
): DatabaseEngineProvider | undefined => {
  const direct = map[collectionName];
  if (direct) return direct;
  const normalized = collectionName.trim().toLowerCase();
  if (!normalized) return undefined;
  const matchedKey = Object.keys(map).find(
    (key) => key.trim().toLowerCase() === normalized
  );
  return matchedKey ? map[matchedKey] : undefined;
};

const readMapFromPrisma = async (key: string): Promise<Record<string, DatabaseEngineProvider>> => {
  if (!process.env['DATABASE_URL']) return {};
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return parseMap(setting?.value);
  } catch {
    return {};
  }
};

const readMapFromMongo = async (key: string): Promise<Record<string, DatabaseEngineProvider>> => {
  if (!process.env['MONGODB_URI']) return {};
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [
          { _id: key },
          { key },
        ],
      });
    return parseMap(doc?.value);
  } catch {
    return {};
  }
};

const readCollectionRouteMap = async (): Promise<Record<string, DatabaseEngineProvider>> => {
  const prismaMap = await readMapFromPrisma(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
  if (Object.keys(prismaMap).length > 0) return prismaMap;
  return readMapFromMongo(DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY);
};

/** Returns the full per-collection routing map (supports prisma/mongodb/redis). */
export async function getCollectionRouteMap(): Promise<Record<string, DatabaseEngineProvider>> {
  const now = Date.now();
  if (mapCache && now - mapCache.ts < CACHE_TTL_MS) {
    return mapCache.value;
  }
  if (mapInflight) {
    return mapInflight;
  }

  mapInflight = (async (): Promise<Record<string, DatabaseEngineProvider>> => {
    return readCollectionRouteMap();
  })();

  const value = await mapInflight;
  mapCache = { value, ts: Date.now() };
  mapInflight = null;
  return value;
}

/** Returns the primary-provider map only (prisma/mongodb). */
export async function getCollectionProviderMap(): Promise<Record<string, AppDbProvider>> {
  const routeMap = await getCollectionRouteMap();
  const primaryMap: Record<string, AppDbProvider> = {};
  for (const [collection, provider] of Object.entries(routeMap)) {
    if (provider === 'mongodb' || provider === 'prisma') {
      primaryMap[collection] = provider;
    }
  }
  return primaryMap;
}

/** Returns the provider for a specific collection, falling back to the app-wide provider. */
export async function getCollectionProvider(collectionName: string): Promise<AppDbProvider> {
  const policy = await getDatabaseEnginePolicy();
  const map = await getCollectionRouteMap();
  const explicit = findCollectionRoute(map, collectionName);
  if (explicit === 'mongodb' || explicit === 'prisma') return explicit;
  if (explicit === 'redis') {
    throw internalError(
      `Collection "${collectionName}" is routed to Redis, but this code path requires Prisma or MongoDB.`
    );
  }
  if (policy.requireExplicitCollectionRouting) {
    throw internalError(
      `Collection "${collectionName}" has no explicit route in Database Engine and explicit collection routing is required.`
    );
  }
  return getAppDbProvider();
}

export type CollectionProviderSelection = 'auto' | AppDbProvider | undefined;

export async function resolveCollectionProviderForRequest(
  collectionName: string,
  requestedProvider: CollectionProviderSelection
): Promise<AppDbProvider> {
  if (requestedProvider === 'mongodb' || requestedProvider === 'prisma') {
    return requestedProvider;
  }
  return getCollectionProvider(collectionName);
}

export const invalidateCollectionProviderMapCache = (): void => {
  mapCache = null;
  mapInflight = null;
};
