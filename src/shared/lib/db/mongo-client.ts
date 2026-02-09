import 'server-only';

import { createRequire } from 'module';

import type { Db } from 'mongodb';
import type { MongoClient } from 'mongodb';
import type { MongoClientOptions } from 'mongodb';


type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;
type MongoGlobalState = {
  __mongoClient?: MongoClient;
  __mongoClientPromise?: Promise<MongoClient>;
  __mongoUri?: string;
};

const globalForMongo = globalThis as typeof globalThis & MongoGlobalState;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  // Turbopack currently struggles to bundle the MongoDB driver (Node built-ins like tls, timers/promises).
  // Use a runtime require with a non-literal specifier to keep it out of the bundler graph.
  const requireFn = createRequire(import.meta.url);
  const pkgName = 'mon' + 'godb';
  return requireFn(pkgName) as { MongoClient: MongoClientCtor };
};

const getMongoUri = (): string => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }
  return uri;
};

const getMongoClientOptions = (): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'], 5_000),
  connectTimeoutMS: parsePositiveInt(process.env['MONGODB_CONNECT_TIMEOUT_MS'], 5_000),
  socketTimeoutMS: parsePositiveInt(process.env['MONGODB_SOCKET_TIMEOUT_MS'], 20_000),
  retryWrites: true,
});

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();

  if (globalForMongo.__mongoUri !== uri) {
    delete globalForMongo.__mongoClient;
    delete globalForMongo.__mongoClientPromise;
    globalForMongo.__mongoUri = uri;
  }

  if (globalForMongo.__mongoClient) return globalForMongo.__mongoClient;

  if (!globalForMongo.__mongoClientPromise) {
    const { MongoClient } = getMongoClientCtor();
    globalForMongo.__mongoClientPromise = new MongoClient(uri, getMongoClientOptions()).connect();
  }

  try {
    globalForMongo.__mongoClient = await globalForMongo.__mongoClientPromise;
    return globalForMongo.__mongoClient;
  } catch (error) {
    delete globalForMongo.__mongoClientPromise;
    throw error;
  }
}

export async function getMongoDb(): Promise<Db> {
  const dbName = process.env['MONGODB_DB'] || 'app';
  const mongoClient = await getMongoClient();
  return mongoClient.db(dbName);
}
