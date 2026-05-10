import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import { resolveEcommerceMongoSourceConfig } from '@/shared/lib/db/utils/mongo';

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

const firstNonEmptyString = (...values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
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

const completeSourceConfig = (
  uri: string,
  dbName: string | null | undefined
): { uri: string; dbName: string } => ({
  uri,
  dbName: firstNonEmptyString(
    dbName ?? '',
    getDatabaseNameFromMongoUri(uri) ?? DEFAULT_ECOM_MONGODB_DB
  ),
});

const resolveRequiredEcommerceMongoSourceConfig = (
  source: 'local' | 'cloud'
): { uri: string; dbName: string } => {
  const config = resolveEcommerceMongoSourceConfig(source);
  if (config.configured && config.uri !== null) {
    return completeSourceConfig(config.uri, config.dbName);
  }

  throw new Error(
    `Ecommerce ${source} MongoDB source is not configured. Set ECOM_MONGODB_${source.toUpperCase()}_URI and ECOM_MONGODB_${source.toUpperCase()}_DB, or configure the Products ${source} MongoDB fallback.`
  );
};

const getClientStore = (): Map<string, MongoClient> => {
  globalForEcommerceMongo.__ecommerceExportMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForEcommerceMongo.__ecommerceExportMongoClientByKey;
};

export async function getCloudEcommerceExportDb(): Promise<Db> {
  const { uri, dbName } = resolveRequiredEcommerceMongoSourceConfig('cloud');
  return connectEcommerceDb(uri, dbName, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
}

const connectEcommerceDb = async (
  uri: string,
  dbName: string,
  options: MongoClientOptions = {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 3_000,
    connectTimeoutMS: 3_000,
  }
): Promise<Db> => {
  const store = getClientStore();
  const cached = store.get(uri);
  if (cached !== undefined) return cached.db(dbName);

  const { MongoClient } = getMongoClientCtor();
  const client = await new MongoClient(uri, options).connect();
  store.set(uri, client);
  return client.db(dbName);
};

export async function getAllEcommerceExportDbsForCleanup(): Promise<Db[]> {
  return [await getCloudEcommerceExportDb()];
}
