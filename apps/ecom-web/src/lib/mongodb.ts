import { MongoClient, type Db } from 'mongodb';

/**
 * Resolve the MongoDB URI using the same source-selection logic as the
 * main geminitestapp, so both apps always point at the same database.
 *
 * Priority:
 *  1. MONGODB_URI (explicit override — works in all environments)
 *  2. MONGODB_ACTIVE_SOURCE_DEFAULT / MONGODB_ACTIVE_SOURCE →
 *       "local"  → MONGODB_LOCAL_URI  + MONGODB_LOCAL_DB
 *       "cloud"  → MONGODB_CLOUD_URI  + MONGODB_CLOUD_DB
 *  3. Fallback to localhost for development convenience
 */
function resolveMongoUri(): string {
  if (process.env.MONGODB_URI?.trim()) return process.env.MONGODB_URI.trim();

  const source =
    (process.env.MONGODB_ACTIVE_SOURCE ?? process.env.MONGODB_ACTIVE_SOURCE_DEFAULT ?? 'local')
      .trim()
      .toLowerCase();

  if (source === 'cloud') {
    const uri = process.env.MONGODB_CLOUD_URI?.trim();
    if (uri) return uri;
  }

  // Default to local
  return process.env.MONGODB_LOCAL_URI?.trim() ?? 'mongodb://127.0.0.1:27017/app';
}

function resolveMongoDb(): string {
  if (process.env.MONGODB_DB?.trim()) return process.env.MONGODB_DB.trim();

  const source =
    (process.env.MONGODB_ACTIVE_SOURCE ?? process.env.MONGODB_ACTIVE_SOURCE_DEFAULT ?? 'local')
      .trim()
      .toLowerCase();

  if (source === 'cloud') {
    const db = process.env.MONGODB_CLOUD_DB?.trim();
    if (db) return db;
  }

  return process.env.MONGODB_LOCAL_DB?.trim() ?? 'app';
}

const g = globalThis as typeof globalThis & { _ecomMongoClient?: MongoClient };

export function hasMongoConfig(): boolean {
  return Boolean(resolveMongoUri());
}

function getClient(): MongoClient {
  const uri = resolveMongoUri();
  if (!uri) throw new Error('No MongoDB URI configured. Set MONGODB_URI or MONGODB_LOCAL_URI in apps/ecom-web/.env.local');
  if (g._ecomMongoClient) return g._ecomMongoClient;
  const c = new MongoClient(uri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  if (process.env.NODE_ENV !== 'production') g._ecomMongoClient = c;
  return c;
}

export async function getDb(): Promise<Db> {
  const c = getClient();
  await c.connect();
  return c.db(resolveMongoDb());
}

/** Returns true if MongoDB is reachable and configured. */
export async function isDbAvailable(): Promise<boolean> {
  if (!resolveMongoUri()) return false;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
