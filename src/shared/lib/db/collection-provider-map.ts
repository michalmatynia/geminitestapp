import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { getAppDbProvider, type AppDbProvider } from './app-db-provider';

export const COLLECTION_PROVIDER_MAP_KEY = 'collection_provider_map';

const CACHE_TTL_MS = 30_000;
let mapCache: { value: Record<string, AppDbProvider>; ts: number } | null = null;
let mapInflight: Promise<Record<string, AppDbProvider>> | null = null;

const parseMap = (raw: unknown): Record<string, AppDbProvider> => {
  if (!raw) return {};
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(str) as Record<string, string>;
    const result: Record<string, AppDbProvider> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 'mongodb' || value === 'prisma') {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
};

const readMapFromPrisma = async (): Promise<Record<string, AppDbProvider>> => {
  if (!process.env['DATABASE_URL']) return {};
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: COLLECTION_PROVIDER_MAP_KEY },
      select: { value: true },
    });
    return parseMap(setting?.value);
  } catch {
    return {};
  }
};

const readMapFromMongo = async (): Promise<Record<string, AppDbProvider>> => {
  if (!process.env['MONGODB_URI']) return {};
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [
          { _id: COLLECTION_PROVIDER_MAP_KEY },
          { key: COLLECTION_PROVIDER_MAP_KEY },
        ],
      });
    return parseMap(doc?.value);
  } catch {
    return {};
  }
};

/** Returns the per-collection provider map from settings (cached 30s). */
export async function getCollectionProviderMap(): Promise<Record<string, AppDbProvider>> {
  const now = Date.now();
  if (mapCache && now - mapCache.ts < CACHE_TTL_MS) {
    return mapCache.value;
  }
  if (mapInflight) {
    return mapInflight;
  }

  mapInflight = (async (): Promise<Record<string, AppDbProvider>> => {
    // Try Prisma first, then Mongo
    const prismaMap = await readMapFromPrisma();
    if (Object.keys(prismaMap).length > 0) return prismaMap;
    return readMapFromMongo();
  })();

  const value = await mapInflight;
  mapCache = { value, ts: Date.now() };
  mapInflight = null;
  return value;
}

/** Returns the provider for a specific collection, falling back to the app-wide provider. */
export async function getCollectionProvider(collectionName: string): Promise<AppDbProvider> {
  const map = await getCollectionProviderMap();
  const explicit = map[collectionName];
  if (explicit) return explicit;
  return getAppDbProvider();
}

export const invalidateCollectionProviderMapCache = (): void => {
  mapCache = null;
  mapInflight = null;
};
