import 'server-only';

import { createRequire } from 'module';

import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

const DEFAULT_PATTERNS_MONGODB_URI = 'mongodb://127.0.0.1:27023/patterns_web_local';
const DEFAULT_PATTERNS_MONGODB_DB = 'patterns_web_local';
const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 3_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 3_000;

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

type PatternsMongoGlobalState = {
  __patternsMongoClientByKey?: Map<string, MongoClient>;
  __patternsMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

export type PatternsMongoConnectionInfo = {
  uri: string;
  dbName: string;
};

const globalForPatternsMongo = globalThis as typeof globalThis & PatternsMongoGlobalState;

const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  const requireFn = createRequire(import.meta.url);
  return requireFn('mongodb') as { MongoClient: MongoClientCtor };
};

const firstEnvValue = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return null;
};

const databaseNameFromUri = (uri: string): string | null => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, '').trim();
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
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

const getPatternsMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['PATTERNS_MONGODB_MAX_POOL_SIZE'], 10),
  minPoolSize: parsePositiveInt(process.env['PATTERNS_MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['PATTERNS_MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['PATTERNS_MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    DEFAULT_SERVER_SELECTION_TIMEOUT_MS
  ),
  connectTimeoutMS: parsePositiveInt(
    process.env['PATTERNS_MONGODB_CONNECT_TIMEOUT_MS'],
    DEFAULT_CONNECT_TIMEOUT_MS
  ),
  socketTimeoutMS: parsePositiveInt(process.env['PATTERNS_MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

export const resolvePatternsMongoConnectionInfo = (): PatternsMongoConnectionInfo => {
  const activeSource = firstEnvValue(
    'PATTERNS_MONGODB_ACTIVE_SOURCE',
    'MONGODB_PATTERNS_ACTIVE_SOURCE'
  );
  const useCloud = activeSource === 'cloud';

  const uri = useCloud
    ? firstEnvValue(
        'PATTERNS_MONGODB_CLOUD_URI',
        'MONGODB_PATTERNS_CLOUD_URI',
        'PATTERNS_MONGODB_URI',
        'MONGODB_PATTERNS_URI',
        ...(process.env['NODE_ENV'] === 'production' ? ['MONGODB_URI'] : [])
      )
    : firstEnvValue(
        'PATTERNS_MONGODB_LOCAL_URI',
        'MONGODB_PATTERNS_LOCAL_URI',
        'PATTERNS_MONGODB_URI',
        'MONGODB_PATTERNS_URI'
      );

  const dbName = useCloud
    ? firstEnvValue(
        'PATTERNS_MONGODB_CLOUD_DB',
        'MONGODB_PATTERNS_CLOUD_DB',
        'PATTERNS_MONGODB_DB',
        'MONGODB_PATTERNS_DB',
        ...(process.env['NODE_ENV'] === 'production' ? ['MONGODB_DB'] : [])
      )
    : firstEnvValue(
        'PATTERNS_MONGODB_LOCAL_DB',
        'MONGODB_PATTERNS_LOCAL_DB',
        'PATTERNS_MONGODB_DB',
        'MONGODB_PATTERNS_DB'
      );

  const resolvedUri = uri ?? DEFAULT_PATTERNS_MONGODB_URI;
  return {
    uri: resolvedUri,
    dbName: dbName ?? databaseNameFromUri(resolvedUri) ?? DEFAULT_PATTERNS_MONGODB_DB,
  };
};

const getPatternsMongoClientByKeyStore = (): Map<string, MongoClient> => {
  globalForPatternsMongo.__patternsMongoClientByKey ??= new Map<string, MongoClient>();
  return globalForPatternsMongo.__patternsMongoClientByKey;
};

const getPatternsMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  globalForPatternsMongo.__patternsMongoClientPromiseByKey ??= new Map<
    string,
    Promise<MongoClient>
  >();
  return globalForPatternsMongo.__patternsMongoClientPromiseByKey;
};

export async function getPatternsMongoClient(): Promise<MongoClient> {
  const { uri } = resolvePatternsMongoConnectionInfo();
  const clientByKey = getPatternsMongoClientByKeyStore();
  const clientPromiseByKey = getPatternsMongoClientPromiseByKeyStore();
  const cachedClient = clientByKey.get(uri);
  if (cachedClient) return cachedClient;

  let clientPromise = clientPromiseByKey.get(uri);
  if (clientPromise === undefined) {
    const { MongoClient: MongoClientImpl } = getMongoClientCtor();
    clientPromise = new MongoClientImpl(uri, getPatternsMongoClientOptions(uri)).connect();
    clientPromiseByKey.set(uri, clientPromise);
  }

  try {
    const client = await clientPromise;
    clientByKey.set(uri, client);
    return client;
  } catch (error) {
    clientPromiseByKey.delete(uri);
    throw error;
  }
}

export async function getPatternsMongoDb(): Promise<Db> {
  const { dbName } = resolvePatternsMongoConnectionInfo();
  const client = await getPatternsMongoClient();
  return client.db(dbName);
}

export async function invalidatePatternsMongoClientCache(): Promise<void> {
  const clientByKey = getPatternsMongoClientByKeyStore();
  const clientPromiseByKey = getPatternsMongoClientPromiseByKeyStore();
  const clients = new Set<MongoClient>(clientByKey.values());

  clientByKey.clear();
  clientPromiseByKey.clear();

  await Promise.allSettled([...clients].map((client) => client.close()));
}
