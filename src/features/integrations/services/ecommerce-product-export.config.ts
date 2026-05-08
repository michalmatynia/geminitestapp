import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';

const DEFAULT_ECOM_MONGODB_URI = 'mongodb://127.0.0.1:27021/ecom_local';
const DEFAULT_ECOM_MONGODB_DB = 'ecom_local';

export const ECOM_PRODUCTS_COLLECTION = 'products';
export const ECOM_CATEGORIES_COLLECTION = 'product_categories';

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

const globalForEcommerceMongo = globalThis as typeof globalThis & {
  __ecommerceExportMongoClientByKey?: Map<string, MongoClient>;
};

const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  const requireFn = createRequire(import.meta.url);
  return requireFn('mongodb') as { MongoClient: MongoClientCtor };
};

const trimString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const firstTrimmedEnvValue = (...keys: string[]): string => {
  for (const key of keys) {
    const value = trimString(process.env[key]);
    if (value.length > 0) return value;
  }
  return '';
};

const firstNonEmptyString = (...values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
};

const resolveActiveSource = (): 'local' | 'cloud' => {
  const source = firstTrimmedEnvValue(
    'ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT',
    'MONGODB_ACTIVE_SOURCE_DEFAULT'
  ).toLowerCase();
  return source === 'cloud' ? 'cloud' : 'local';
};

const getDatabaseNameFromMongoUri = (uri: string): string | null => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, '').trim();
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
};

const resolveEcommerceMongoConfig = (): { uri: string; dbName: string } => {
  const source = resolveActiveSource();
  const sourceUri =
    source === 'cloud'
      ? firstTrimmedEnvValue('ECOM_MONGODB_CLOUD_URI', 'MONGODB_ECOM_CLOUD_URI')
      : firstTrimmedEnvValue('ECOM_MONGODB_LOCAL_URI', 'MONGODB_ECOM_LOCAL_URI');
  const sourceDbName =
    source === 'cloud'
      ? firstTrimmedEnvValue('ECOM_MONGODB_CLOUD_DB', 'MONGODB_ECOM_CLOUD_DB')
      : firstTrimmedEnvValue('ECOM_MONGODB_LOCAL_DB', 'MONGODB_ECOM_LOCAL_DB');

  const legacyUri = firstTrimmedEnvValue('ECOM_MONGODB_URI', 'MONGODB_ECOM_URI');
  const legacyDbName = firstTrimmedEnvValue('ECOM_MONGODB_DB', 'MONGODB_ECOM_DB');
  const resolvedUri = firstNonEmptyString(sourceUri, legacyUri, DEFAULT_ECOM_MONGODB_URI);
  const uriDbName = getDatabaseNameFromMongoUri(resolvedUri) ?? DEFAULT_ECOM_MONGODB_DB;

  return {
    uri: resolvedUri,
    dbName: firstNonEmptyString(sourceDbName, legacyDbName, uriDbName),
  };
};

const getClientStore = (): Map<string, MongoClient> => {
  globalForEcommerceMongo.__ecommerceExportMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForEcommerceMongo.__ecommerceExportMongoClientByKey;
};

export async function getEcommerceExportDb(): Promise<Db> {
  const { uri, dbName } = resolveEcommerceMongoConfig();
  const store = getClientStore();
  const cached = store.get(uri);
  if (cached !== undefined) return cached.db(dbName);

  const { MongoClient } = getMongoClientCtor();
  const client = await new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  }).connect();
  store.set(uri, client);
  return client.db(dbName);
}

const connectEcommerceDb = async (uri: string, dbName: string): Promise<Db> => {
  const store = getClientStore();
  const cached = store.get(uri);
  if (cached !== undefined) return cached.db(dbName);
  const { MongoClient } = getMongoClientCtor();
  const client = await new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 3_000,
    connectTimeoutMS: 3_000,
  }).connect();
  store.set(uri, client);
  return client.db(dbName);
};

export async function getAllEcommerceExportDbsForCleanup(): Promise<Db[]> {
  // Use resolveEcommerceMongoSourceConfig (shared util) which has all env-var fallbacks,
  // including PRODUCTS_MONGODB_CLOUD_URI as a last-resort for the cloud source.
  const localConfig = resolveEcommerceMongoSourceConfig('local');
  const cloudConfig = resolveEcommerceMongoSourceConfig('cloud');

  // Deduplicate by URI — active source is always included.
  const activeConfig = resolveEcommerceMongoConfig();
  const pairsByUri = new Map<string, string>();
  pairsByUri.set(activeConfig.uri, activeConfig.dbName);

  if (localConfig.configured && localConfig.uri !== null) {
    const dbName = localConfig.dbName ?? getDatabaseNameFromMongoUri(localConfig.uri) ?? DEFAULT_ECOM_MONGODB_DB;
    if (!pairsByUri.has(localConfig.uri)) pairsByUri.set(localConfig.uri, dbName);
  }
  if (cloudConfig.configured && cloudConfig.uri !== null) {
    const dbName = cloudConfig.dbName ?? getDatabaseNameFromMongoUri(cloudConfig.uri) ?? DEFAULT_ECOM_MONGODB_DB;
    if (!pairsByUri.has(cloudConfig.uri)) pairsByUri.set(cloudConfig.uri, dbName);
  }

  if (pairsByUri.size === 1) {
    // Only one distinct URI — reuse the already-cached active connection.
    return [await getEcommerceExportDb()];
  }

  const results = await Promise.allSettled(
    Array.from(pairsByUri.entries()).map(([uri, dbName]) => connectEcommerceDb(uri, dbName))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Db> => r.status === 'fulfilled')
    .map((r) => r.value);
}
