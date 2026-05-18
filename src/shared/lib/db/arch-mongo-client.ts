/**
 * Arch MongoDB Client
 *
 * Routes Milkbar Designers runtime, CMS source data, and local logs to the
 * detached architecture database.
 */

import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb as getDefaultMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveArchMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
const DEFAULT_MONGO_CONNECT_TIMEOUT_MS = 5_000;

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

type ArchMongoGlobalState = {
  __archMongoClientByKey?: Map<string, MongoClient>;
  __archMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForArchMongo = globalThis as typeof globalThis & ArchMongoGlobalState;

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

const getArchMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['ARCH_MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['ARCH_MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['ARCH_MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['ARCH_MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
  ),
  connectTimeoutMS: parsePositiveInt(
    process.env['ARCH_MONGODB_CONNECT_TIMEOUT_MS'],
    DEFAULT_MONGO_CONNECT_TIMEOUT_MS
  ),
  socketTimeoutMS: parsePositiveInt(process.env['ARCH_MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
  monitorCommands: true,
});

const getArchMongoClientByKeyStore = (): Map<string, MongoClient> => {
  globalForArchMongo.__archMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForArchMongo.__archMongoClientByKey;
};

const getArchMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  globalForArchMongo.__archMongoClientPromiseByKey ??= new Map<
    string,
    Promise<MongoClient>
  >();
  return globalForArchMongo.__archMongoClientPromiseByKey;
};

const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

const resolveArchMongoSource = (preferredSource?: MongoSource): MongoSource => {
  if (preferredSource !== undefined) return preferredSource;
  return (
    normalizeMongoSource(process.env['ARCH_MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ARCH_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    'local'
  );
};

const shouldUseDefaultMongoDbInTests = (): boolean =>
  process.env['ARCH_MONGODB_USE_DEDICATED_DB_IN_TESTS'] !== 'true' &&
  (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true');

const getNonEmptyConfigValue = (value: string | null): string | null => {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requireArchMongoConfig = (source: MongoSource): { uri: string; dbName: string } => {
  const config = resolveArchMongoSourceConfig(source);
  const uri = getNonEmptyConfigValue(config.uri);
  const dbName = getNonEmptyConfigValue(config.dbName);
  if (!config.configured || uri === null || dbName === null) {
    throw configurationError(
      `Arch ${source} MongoDB source is not configured. Set ARCH_MONGODB_${source.toUpperCase()}_URI and ARCH_MONGODB_${source.toUpperCase()}_DB.`
    );
  }
  return { uri, dbName };
};

export async function invalidateArchMongoClientCache(): Promise<void> {
  const clientByKey = getArchMongoClientByKeyStore();
  const clientPromiseByKey = getArchMongoClientPromiseByKeyStore();
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

export async function getArchMongoClient(preferredSource?: MongoSource): Promise<MongoClient> {
  const source = resolveArchMongoSource(preferredSource);
  const { uri } = requireArchMongoConfig(source);

  const clientCacheKey = `${source}:${uri}`;
  const clientByKey = getArchMongoClientByKeyStore();
  const clientPromiseByKey = getArchMongoClientPromiseByKeyStore();
  const cachedClient = clientByKey.get(clientCacheKey);
  if (cachedClient) return cachedClient;

  let clientPromise = clientPromiseByKey.get(clientCacheKey);
  if (clientPromise === undefined) {
    const { MongoClient } = getMongoClientCtor();
    clientPromise = new MongoClient(uri, getArchMongoClientOptions(uri)).connect();
    clientPromiseByKey.set(clientCacheKey, clientPromise);
  }

  try {
    const resolvedClient = await clientPromise;
    clientByKey.set(clientCacheKey, resolvedClient);
    return resolvedClient;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.arch-mongo-client',
      action: 'getArchMongoClient',
    });
    clientPromiseByKey.delete(clientCacheKey);
    throw error;
  }
}

export async function getArchMongoDb(preferredSource?: MongoSource): Promise<Db> {
  if (shouldUseDefaultMongoDbInTests()) {
    return getDefaultMongoDb(preferredSource);
  }

  const source = resolveArchMongoSource(preferredSource);
  const { dbName } = requireArchMongoConfig(source);
  const mongoClient = await getArchMongoClient(source);
  return mongoClient.db(dbName);
}

export {
  getArchMongoClient as getMongoClient,
  getArchMongoDb as getMongoDb,
  invalidateArchMongoClientCache as invalidateMongoClientCache,
};
