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

export function hasMongoConfig(): boolean {
  return Boolean(resolveMongoUri());
}

function resolveProductsMongoUri(): string {
  if (process.env.PRODUCTS_MONGODB_URI?.trim()) return process.env.PRODUCTS_MONGODB_URI.trim();
  if (process.env.MONGODB_PRODUCTS_URI?.trim()) return process.env.MONGODB_PRODUCTS_URI.trim();

  const source =
    (
      process.env.PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT ??
      process.env.MONGODB_ACTIVE_SOURCE ??
      process.env.MONGODB_ACTIVE_SOURCE_DEFAULT ??
      'local'
    )
      .trim()
      .toLowerCase();

  if (source === 'cloud') {
    const uri =
      process.env.PRODUCTS_MONGODB_CLOUD_URI?.trim() ??
      process.env.MONGODB_PRODUCTS_CLOUD_URI?.trim();
    if (uri) return uri;
  }

  return (
    process.env.PRODUCTS_MONGODB_LOCAL_URI?.trim() ??
    process.env.MONGODB_PRODUCTS_LOCAL_URI?.trim() ??
    'mongodb://127.0.0.1:27020/products_local'
  );
}

function resolveProductsMongoDb(): string {
  if (process.env.PRODUCTS_MONGODB_DB?.trim()) return process.env.PRODUCTS_MONGODB_DB.trim();
  if (process.env.MONGODB_PRODUCTS_DB?.trim()) return process.env.MONGODB_PRODUCTS_DB.trim();

  const source =
    (
      process.env.PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT ??
      process.env.MONGODB_ACTIVE_SOURCE ??
      process.env.MONGODB_ACTIVE_SOURCE_DEFAULT ??
      'local'
    )
      .trim()
      .toLowerCase();

  if (source === 'cloud') {
    const db =
      process.env.PRODUCTS_MONGODB_CLOUD_DB?.trim() ??
      process.env.MONGODB_PRODUCTS_CLOUD_DB?.trim();
    if (db) return db;
  }

  return (
    process.env.PRODUCTS_MONGODB_LOCAL_DB?.trim() ??
    process.env.MONGODB_PRODUCTS_LOCAL_DB?.trim() ??
    'products_local'
  );
}

const clientCache = new Map<string, MongoClient>();

function getClient(uri: string, label: string): MongoClient {
  if (!uri) {
    throw new Error(
      `No ${label} MongoDB URI configured. Set MONGODB_URI or PRODUCTS_MONGODB_LOCAL_URI in apps/ecom-web/.env.local`
    );
  }
  const existing = clientCache.get(uri);
  if (existing) return existing;
  const c = new MongoClient(uri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  clientCache.set(uri, c);
  return c;
}

export async function getDb(): Promise<Db> {
  const c = getClient(resolveMongoUri(), 'main');
  await c.connect();
  return c.db(resolveMongoDb());
}

export function hasProductsMongoConfig(): boolean {
  return Boolean(resolveProductsMongoUri());
}

export async function getProductsDb(): Promise<Db> {
  const c = getClient(resolveProductsMongoUri(), 'products');
  await c.connect();
  return c.db(resolveProductsMongoDb());
}

export async function getEcomAuthDb(): Promise<Db> {
  return getProductsDb();
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
