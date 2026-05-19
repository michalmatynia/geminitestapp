import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

import { AppErrorCodes, createAppError, isAppError } from '@/shared/errors/app-error';
import {
  isTransientMongoConnectionError,
  resolveEcommerceMongoSourceConfig,
} from '@/shared/lib/db/utils/mongo';

const DEFAULT_ECOM_MONGODB_DB = 'ecom_local';

export const ECOM_PRODUCTS_COLLECTION = 'products';
export const ECOM_CATEGORIES_COLLECTION = 'product_categories';

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;
type EcommerceMongoSource = 'local' | 'cloud';
type ResolvedEcommerceMongoConfig = {
  source: EcommerceMongoSource;
  uri: string;
  dbName: string;
};
export type EcommerceExportDbTarget = {
  dbName: string;
  db: Db;
  key: string;
  source: EcommerceMongoSource;
};

const globalForEcommerceMongo = globalThis as typeof globalThis & {
  __ecommerceExportMongoClientByKey?: Map<string, MongoClient>;
};

const CLOUD_ECOMMERCE_MONGO_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
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
  source: EcommerceMongoSource,
  uri: string,
  dbName: string | null | undefined
): ResolvedEcommerceMongoConfig => ({
  source,
  uri,
  dbName: firstNonEmptyString(
    dbName ?? '',
    getDatabaseNameFromMongoUri(uri) ?? DEFAULT_ECOM_MONGODB_DB
  ),
});

const resolveRequiredEcommerceMongoSourceConfig = (
  source: EcommerceMongoSource
): ResolvedEcommerceMongoConfig => {
  const config = resolveEcommerceMongoSourceConfig(source);
  if (config.configured && config.uri !== null) {
    return completeSourceConfig(source, config.uri, config.dbName);
  }

  throw new Error(
    `Ecommerce ${source} MongoDB source is not configured. Set ECOM_MONGODB_${source.toUpperCase()}_URI and ECOM_MONGODB_${source.toUpperCase()}_DB, or configure the Products ${source} MongoDB fallback.`
  );
};

const resolveOptionalEcommerceMongoSourceConfig = (
  source: EcommerceMongoSource
): ResolvedEcommerceMongoConfig | null => {
  const config = resolveEcommerceMongoSourceConfig(source);
  if (config.configured && config.uri !== null) {
    return completeSourceConfig(source, config.uri, config.dbName);
  }
  return null;
};

const getClientStore = (): Map<string, MongoClient> => {
  globalForEcommerceMongo.__ecommerceExportMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForEcommerceMongo.__ecommerceExportMongoClientByKey;
};

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

const connectResolvedEcommerceDb = async (
  config: ResolvedEcommerceMongoConfig,
  options?: MongoClientOptions
): Promise<Db> => connectEcommerceDb(config.uri, config.dbName, options);

const getResolvedEcommerceDbOptions = (
  source: EcommerceMongoSource
): MongoClientOptions | undefined => (
  source === 'cloud' ? CLOUD_ECOMMERCE_MONGO_OPTIONS : undefined
);

const connectResolvedEcommerceTarget = async (
  config: ResolvedEcommerceMongoConfig
): Promise<EcommerceExportDbTarget> => ({
  dbName: config.dbName,
  source: config.source,
  key: `${config.source}:${config.uri}::${config.dbName}`,
  db: await connectResolvedEcommerceDb(config, getResolvedEcommerceDbOptions(config.source)).catch(
    (error: unknown) => {
      throw toEcommerceExportDbError(config, error);
    }
  ),
});

const isEcommerceDbReachabilityError = (error: unknown): boolean => {
  if (isTransientMongoConnectionError(error)) return true;
  if (!(error instanceof Error)) return false;
  return `${error.name} ${error.message}`.toLowerCase().includes('eperm');
};

const getEcommerceSourceLabel = (source: EcommerceMongoSource): string =>
  source === 'local' ? 'Local ecommerce database' : 'Cloud ecommerce database';

export const toEcommerceExportDbError = (
  target: Pick<ResolvedEcommerceMongoConfig, 'dbName' | 'source'>,
  error: unknown
): unknown => {
  if (isAppError(error)) return error;
  if (!isEcommerceDbReachabilityError(error)) return error;

  const label = getEcommerceSourceLabel(target.source);
  return createAppError(
    `${label} is not reachable. ${
      target.source === 'local'
        ? 'Start the local ecommerce MongoDB service and try again.'
        : 'Check the cloud ecommerce MongoDB connection and try again.'
    }`,
    {
      code: AppErrorCodes.databaseError,
      httpStatus: 503,
      cause: error,
      expected: true,
      critical: true,
      retryable: true,
      retryAfterMs: 5_000,
      meta: {
        ecommerceMongoDbName: target.dbName,
        ecommerceMongoSource: target.source,
      },
    }
  );
};

const connectResolvedEcommerceTargets = async (
  configs: ResolvedEcommerceMongoConfig[]
): Promise<EcommerceExportDbTarget[]> => {
  const results = await Promise.allSettled(
    configs.map((config) => connectResolvedEcommerceTarget(config))
  );
  const localRejectedIndex = results.findIndex(
    (result, index) => configs[index]?.source === 'local' && result.status === 'rejected'
  );
  if (localRejectedIndex >= 0) {
    const result = results[localRejectedIndex];
    if (result?.status === 'rejected') throw result.reason;
  }

  const firstRejected = results.find((result) => result.status === 'rejected');
  if (firstRejected?.status === 'rejected') throw firstRejected.reason;

  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
};

const dedupeResolvedEcommerceConfigs = (
  configs: ResolvedEcommerceMongoConfig[]
): ResolvedEcommerceMongoConfig[] => {
  const seen = new Set<string>();
  return configs.filter((config) => {
    const key = `${config.uri}::${config.dbName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function getLocalEcommerceExportDb(): Promise<Db> {
  const config = resolveRequiredEcommerceMongoSourceConfig('local');
  return connectResolvedEcommerceDb(config).catch((error: unknown) => {
    throw toEcommerceExportDbError(config, error);
  });
}

export async function getCloudEcommerceExportDb(): Promise<Db> {
  const config = resolveRequiredEcommerceMongoSourceConfig('cloud');
  return connectResolvedEcommerceDb(config, CLOUD_ECOMMERCE_MONGO_OPTIONS).catch(
    (error: unknown) => {
      throw toEcommerceExportDbError(config, error);
    }
  );
}

export async function getAllEcommerceExportDbsForWrite(): Promise<Db[]> {
  const targets = await getAllEcommerceExportDbTargetsForWrite();
  return targets.map((target) => target.db);
}

export async function getAllEcommerceExportDbTargetsForWrite(): Promise<EcommerceExportDbTarget[]> {
  const sources: EcommerceMongoSource[] = ['local', 'cloud'];
  const resolved = sources
    .map(resolveOptionalEcommerceMongoSourceConfig)
    .filter((c): c is ResolvedEcommerceMongoConfig => c !== null);
  const configs = dedupeResolvedEcommerceConfigs(resolved);

  if (configs.length === 0) {
    throw createAppError(
      'No ecommerce database is configured. Set ECOM_MONGODB_LOCAL_URI or ECOM_MONGODB_CLOUD_URI and try again.',
      {
        code: AppErrorCodes.configurationError,
        httpStatus: 503,
        expected: true,
        critical: false,
        retryable: false,
      }
    );
  }

  return connectResolvedEcommerceTargets(configs);
}

export async function getAllEcommerceExportDbsForCleanup(): Promise<Db[]> {
  return getAllEcommerceExportDbsForWrite();
}
