import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb as getDefaultMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveProductsMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
const DEFAULT_MONGO_CONNECT_TIMEOUT_MS = 5_000;

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;
type ProductMongoGlobalState = {
  __productsMongoClientByKey?: Map<string, MongoClient>;
  __productsMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForProductsMongo = globalThis as typeof globalThis & ProductMongoGlobalState;

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

const getProductsMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['PRODUCTS_MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['PRODUCTS_MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['PRODUCTS_MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['PRODUCTS_MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
  ),
  connectTimeoutMS: parsePositiveInt(
    process.env['PRODUCTS_MONGODB_CONNECT_TIMEOUT_MS'],
    DEFAULT_MONGO_CONNECT_TIMEOUT_MS
  ),
  socketTimeoutMS: parsePositiveInt(process.env['PRODUCTS_MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
  monitorCommands: true,
});

const getProductsMongoClientByKeyStore = (): Map<string, MongoClient> => {
  if (!globalForProductsMongo.__productsMongoClientByKey) {
    globalForProductsMongo.__productsMongoClientByKey = new Map<string, MongoClient>();
  }
  return globalForProductsMongo.__productsMongoClientByKey;
};

const getProductsMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  if (!globalForProductsMongo.__productsMongoClientPromiseByKey) {
    globalForProductsMongo.__productsMongoClientPromiseByKey = new Map<
      string,
      Promise<MongoClient>
    >();
  }
  return globalForProductsMongo.__productsMongoClientPromiseByKey;
};

const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

const resolveProductsMongoSource = (preferredSource?: MongoSource): MongoSource => {
  if (preferredSource) return preferredSource;
  return (
    normalizeMongoSource(process.env['PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    'local'
  );
};

const shouldUseDefaultMongoDbInTests = (): boolean =>
  process.env['PRODUCTS_MONGODB_USE_DEDICATED_DB_IN_TESTS'] !== 'true' &&
  (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true');

export async function invalidateProductsMongoClientCache(): Promise<void> {
  const clientByKey = getProductsMongoClientByKeyStore();
  const clientPromiseByKey = getProductsMongoClientPromiseByKeyStore();
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

export async function getProductsMongoClient(preferredSource?: MongoSource): Promise<MongoClient> {
  const source = resolveProductsMongoSource(preferredSource);
  const config = resolveProductsMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError(
      `Products ${source} MongoDB source is not configured. Set PRODUCTS_MONGODB_${source.toUpperCase()}_URI and PRODUCTS_MONGODB_${source.toUpperCase()}_DB.`
    );
  }

  const clientCacheKey = `${source}:${config.uri}`;
  const clientByKey = getProductsMongoClientByKeyStore();
  const clientPromiseByKey = getProductsMongoClientPromiseByKeyStore();
  const cachedClient = clientByKey.get(clientCacheKey);
  if (cachedClient) return cachedClient;

  if (!clientPromiseByKey.has(clientCacheKey)) {
    const { MongoClient } = getMongoClientCtor();
    clientPromiseByKey.set(
      clientCacheKey,
      new MongoClient(config.uri, getProductsMongoClientOptions(config.uri)).connect()
    );
  }

  try {
    const resolvedClient = await clientPromiseByKey.get(clientCacheKey)!;
    clientByKey.set(clientCacheKey, resolvedClient);
    return resolvedClient;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.product-mongo-client',
      action: 'getProductsMongoClient',
    });
    clientPromiseByKey.delete(clientCacheKey);
    throw error;
  }
}

export async function getProductsMongoDb(preferredSource?: MongoSource): Promise<Db> {
  if (shouldUseDefaultMongoDbInTests()) {
    return getDefaultMongoDb(preferredSource);
  }

  const source = resolveProductsMongoSource(preferredSource);
  const config = resolveProductsMongoSourceConfig(source);
  if (!config.configured || !config.uri || !config.dbName) {
    throw configurationError(
      `Products ${source} MongoDB source is not configured. Set PRODUCTS_MONGODB_${source.toUpperCase()}_URI and PRODUCTS_MONGODB_${source.toUpperCase()}_DB.`
    );
  }
  const mongoClient = await getProductsMongoClient(source);
  return mongoClient.db(config.dbName);
}

export {
  getProductsMongoClient as getMongoClient,
  getProductsMongoDb as getMongoDb,
  invalidateProductsMongoClientCache as invalidateMongoClientCache,
};
