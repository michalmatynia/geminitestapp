/**
 * StudiQ MongoDB Client
 *
 * Routes Kangur/StudiQ runtime and CMS content to the detached StudiQ database.
 */

import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import type { MongoSource } from '@/shared/contracts/database';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb as getDefaultMongoDb } from '@/shared/lib/db/mongo-client';
import { resolveStudiqMongoSourceConfig } from '@/shared/lib/db/utils/mongo';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
const DEFAULT_MONGO_CONNECT_TIMEOUT_MS = 5_000;

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

type StudiqMongoGlobalState = {
  __studiqMongoClientByKey?: Map<string, MongoClient>;
  __studiqMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForStudiqMongo = globalThis as typeof globalThis & StudiqMongoGlobalState;

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

const getStudiqMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['STUDIQ_MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['STUDIQ_MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['STUDIQ_MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['STUDIQ_MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
  ),
  connectTimeoutMS: parsePositiveInt(
    process.env['STUDIQ_MONGODB_CONNECT_TIMEOUT_MS'],
    DEFAULT_MONGO_CONNECT_TIMEOUT_MS
  ),
  socketTimeoutMS: parsePositiveInt(process.env['STUDIQ_MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
  monitorCommands: true,
});

const getStudiqMongoClientByKeyStore = (): Map<string, MongoClient> => {
  globalForStudiqMongo.__studiqMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForStudiqMongo.__studiqMongoClientByKey;
};

const getStudiqMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  globalForStudiqMongo.__studiqMongoClientPromiseByKey ??= new Map<
    string,
    Promise<MongoClient>
  >();
  return globalForStudiqMongo.__studiqMongoClientPromiseByKey;
};

const normalizeMongoSource = (value: unknown): MongoSource | null =>
  value === 'local' || value === 'cloud' ? value : null;

const resolveStudiqMongoSource = (preferredSource?: MongoSource): MongoSource => {
  if (preferredSource !== undefined) return preferredSource;
  return (
    normalizeMongoSource(process.env['STUDIQ_MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    normalizeMongoSource(process.env['MONGODB_ACTIVE_SOURCE_DEFAULT']) ??
    'local'
  );
};

const shouldUseDefaultMongoDbInTests = (): boolean =>
  process.env['STUDIQ_MONGODB_USE_DEDICATED_DB_IN_TESTS'] !== 'true' &&
  (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true');

const getNonEmptyConfigValue = (value: string | null): string | null => {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requireStudiqMongoConfig = (source: MongoSource): { uri: string; dbName: string } => {
  const config = resolveStudiqMongoSourceConfig(source);
  const uri = getNonEmptyConfigValue(config.uri);
  const dbName = getNonEmptyConfigValue(config.dbName);
  if (!config.configured || uri === null || dbName === null) {
    throw configurationError(
      `StudiQ ${source} MongoDB source is not configured. Set STUDIQ_MONGODB_${source.toUpperCase()}_URI and STUDIQ_MONGODB_${source.toUpperCase()}_DB.`
    );
  }
  return { uri, dbName };
};

export async function invalidateStudiqMongoClientCache(): Promise<void> {
  const clientByKey = getStudiqMongoClientByKeyStore();
  const clientPromiseByKey = getStudiqMongoClientPromiseByKeyStore();
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

export async function getStudiqMongoClient(preferredSource?: MongoSource): Promise<MongoClient> {
  const source = resolveStudiqMongoSource(preferredSource);
  const { uri } = requireStudiqMongoConfig(source);

  const clientCacheKey = `${source}:${uri}`;
  const clientByKey = getStudiqMongoClientByKeyStore();
  const clientPromiseByKey = getStudiqMongoClientPromiseByKeyStore();
  const cachedClient = clientByKey.get(clientCacheKey);
  if (cachedClient) return cachedClient;

  let clientPromise = clientPromiseByKey.get(clientCacheKey);
  if (clientPromise === undefined) {
    const { MongoClient } = getMongoClientCtor();
    clientPromise = new MongoClient(uri, getStudiqMongoClientOptions(uri)).connect();
    clientPromiseByKey.set(clientCacheKey, clientPromise);
  }

  try {
    const resolvedClient = await clientPromise;
    clientByKey.set(clientCacheKey, resolvedClient);
    return resolvedClient;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.studiq-mongo-client',
      action: 'getStudiqMongoClient',
    });
    clientPromiseByKey.delete(clientCacheKey);
    throw error;
  }
}

export async function getStudiqMongoDb(preferredSource?: MongoSource): Promise<Db> {
  if (shouldUseDefaultMongoDbInTests()) {
    return getDefaultMongoDb(preferredSource);
  }

  const source = resolveStudiqMongoSource(preferredSource);
  const { dbName } = requireStudiqMongoConfig(source);
  const mongoClient = await getStudiqMongoClient(source);
  return mongoClient.db(dbName);
}

export {
  getStudiqMongoClient as getMongoClient,
  getStudiqMongoDb as getMongoDb,
  invalidateStudiqMongoClientCache as invalidateMongoClientCache,
};
