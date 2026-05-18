/**
 * Ecommerce MongoDB Client
 *
 * Routes Stargater ecommerce runtime/page data and local logs to the detached
 * ecommerce database.
 */

import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb as getDefaultMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
const DEFAULT_MONGO_CONNECT_TIMEOUT_MS = 5_000;

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

type EcommerceMongoGlobalState = {
  __ecommerceMongoClientByKey?: Map<string, MongoClient>;
  __ecommerceMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForEcommerceMongo = globalThis as typeof globalThis & EcommerceMongoGlobalState;

const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  const requireFn = createRequire(import.meta.url);
  return requireFn('mongodb') as { MongoClient: MongoClientCtor };
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const isSingleNodeLocalMongoUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (
      (hostname === '127.0.0.1' || hostname === 'localhost') &&
      !parsed.searchParams.has('replicaSet')
    );
  } catch {
    return false;
  }
};

const getEcommerceMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['ECOM_MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['ECOM_MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['ECOM_MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['ECOM_MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
  ),
  connectTimeoutMS: parsePositiveInt(
    process.env['ECOM_MONGODB_CONNECT_TIMEOUT_MS'],
    DEFAULT_MONGO_CONNECT_TIMEOUT_MS
  ),
  socketTimeoutMS: parsePositiveInt(process.env['ECOM_MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
  monitorCommands: true,
});

const getEcommerceMongoClientByKeyStore = (): Map<string, MongoClient> => {
  globalForEcommerceMongo.__ecommerceMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForEcommerceMongo.__ecommerceMongoClientByKey;
};

const getEcommerceMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  globalForEcommerceMongo.__ecommerceMongoClientPromiseByKey ??= new Map<
    string,
    Promise<MongoClient>
  >();
  return globalForEcommerceMongo.__ecommerceMongoClientPromiseByKey;
};

const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

const resolveEcommerceMongoSource = (preferredSource?: MongoSource): MongoSource => {
  if (preferredSource !== undefined) return preferredSource;
  return (
    normalizeMongoSource(process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ECOM_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    'local'
  );
};

const shouldUseDefaultMongoDbInTests = (): boolean =>
  process.env['ECOMMERCE_MONGODB_USE_DEDICATED_DB_IN_TESTS'] !== 'true' &&
  (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true');

const getNonEmptyConfigValue = (value: string | null): string | null => {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requireEcommerceMongoConfig = (source: MongoSource): { uri: string; dbName: string } => {
  const config = resolveEcommerceMongoSourceConfig(source);
  const uri = getNonEmptyConfigValue(config.uri);
  const dbName = getNonEmptyConfigValue(config.dbName);
  if (!config.configured || uri === null || dbName === null) {
    throw configurationError(
      `Ecommerce ${source} MongoDB source is not configured. Set ECOM_MONGODB_${source.toUpperCase()}_URI and ECOM_MONGODB_${source.toUpperCase()}_DB.`
    );
  }
  return { uri, dbName };
};

export async function invalidateEcommerceMongoClientCache(): Promise<void> {
  const clientByKey = getEcommerceMongoClientByKeyStore();
  const clientPromiseByKey = getEcommerceMongoClientPromiseByKeyStore();
  const cachedClients = new Set<MongoClient>(clientByKey.values());
  const pendingClientPromises = [...clientPromiseByKey.values()];

  clientByKey.clear();
  clientPromiseByKey.clear();

  await Promise.allSettled([...cachedClients].map((client) => client.close()));
  pendingClientPromises.forEach((clientPromise) => {
    void clientPromise
      .then(async (client) => {
        if (!cachedClients.has(client)) await client.close();
      })
      .catch(() => undefined);
  });
}

export async function getEcommerceMongoClient(
  preferredSource?: MongoSource
): Promise<MongoClient> {
  const source = resolveEcommerceMongoSource(preferredSource);
  const { uri } = requireEcommerceMongoConfig(source);

  const clientCacheKey = `${source}:${uri}`;
  const clientByKey = getEcommerceMongoClientByKeyStore();
  const clientPromiseByKey = getEcommerceMongoClientPromiseByKeyStore();
  const cachedClient = clientByKey.get(clientCacheKey);
  if (cachedClient) return cachedClient;

  let clientPromise = clientPromiseByKey.get(clientCacheKey);
  if (clientPromise === undefined) {
    const { MongoClient } = getMongoClientCtor();
    clientPromise = new MongoClient(uri, getEcommerceMongoClientOptions(uri)).connect();
    clientPromiseByKey.set(clientCacheKey, clientPromise);
  }

  try {
    const resolvedClient = await clientPromise;
    clientByKey.set(clientCacheKey, resolvedClient);
    return resolvedClient;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.ecommerce-mongo-client',
      action: 'getEcommerceMongoClient',
    });
    clientPromiseByKey.delete(clientCacheKey);
    throw error;
  }
}

export async function getEcommerceMongoDb(preferredSource?: MongoSource): Promise<Db> {
  if (shouldUseDefaultMongoDbInTests()) {
    return getDefaultMongoDb(preferredSource);
  }

  const source = resolveEcommerceMongoSource(preferredSource);
  const { dbName } = requireEcommerceMongoConfig(source);
  const mongoClient = await getEcommerceMongoClient(source);
  return mongoClient.db(dbName);
}

export {
  getEcommerceMongoClient as getMongoClient,
  getEcommerceMongoDb as getMongoDb,
  invalidateEcommerceMongoClientCache as invalidateMongoClientCache,
};
