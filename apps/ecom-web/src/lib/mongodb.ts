import { MongoClient, type Db } from 'mongodb';

const DEFAULT_ECOM_MONGODB_URI = 'mongodb://127.0.0.1:27021/ecom_local';
const DEFAULT_ECOM_MONGODB_DB = 'ecom_local';

function envValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * Resolve the MongoDB URI using source-selection variables local to the
 * ecommerce app. In local development this should point at the thin
 * ecommerce MongoDB file, not the main geminitestapp product database.
 *
 * Priority:
 *  1. MONGODB_URI (explicit override — works in all environments)
 *  2. MONGODB_ACTIVE_SOURCE_DEFAULT / MONGODB_ACTIVE_SOURCE →
 *       "local"  → MONGODB_LOCAL_URI  + MONGODB_LOCAL_DB
 *       "cloud"  → MONGODB_CLOUD_URI  + MONGODB_CLOUD_DB
 *  3. Fallback to localhost for development convenience
 */
function resolveMongoUri(): string {
  const directUri = envValue('MONGODB_URI');
  if (directUri !== undefined) return directUri;

  const source =
    (envValue('MONGODB_ACTIVE_SOURCE') ?? envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ?? 'local')
      .toLowerCase();

  if (source === 'cloud') {
    const uri = envValue('MONGODB_CLOUD_URI');
    if (uri !== undefined) return uri;
  }

  // Default to local
  return envValue('MONGODB_LOCAL_URI') ?? DEFAULT_ECOM_MONGODB_URI;
}

function resolveMongoDb(): string {
  const directDb = envValue('MONGODB_DB');
  if (directDb !== undefined) return directDb;

  const source =
    (envValue('MONGODB_ACTIVE_SOURCE') ?? envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ?? 'local')
      .toLowerCase();

  if (source === 'cloud') {
    const db = envValue('MONGODB_CLOUD_DB');
    if (db !== undefined) return db;
  }

  return envValue('MONGODB_LOCAL_DB') ?? DEFAULT_ECOM_MONGODB_DB;
}

export function hasMongoConfig(): boolean {
  return Boolean(resolveMongoUri());
}

function resolveProductsMongoUri(): string {
  const directUri = envValue('PRODUCTS_MONGODB_URI') ?? envValue('MONGODB_PRODUCTS_URI');
  if (directUri !== undefined) return directUri;

  const source =
    (
      envValue('PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      envValue('MONGODB_ACTIVE_SOURCE') ??
      envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      'local'
    )
      .toLowerCase();

  if (source === 'cloud') {
    const uri =
      envValue('PRODUCTS_MONGODB_CLOUD_URI') ??
      envValue('MONGODB_PRODUCTS_CLOUD_URI');
    if (uri !== undefined) return uri;
  }

  return (
    envValue('PRODUCTS_MONGODB_LOCAL_URI') ??
    envValue('MONGODB_PRODUCTS_LOCAL_URI') ??
    DEFAULT_ECOM_MONGODB_URI
  );
}

function resolveProductsMongoDb(): string {
  const directDb = envValue('PRODUCTS_MONGODB_DB') ?? envValue('MONGODB_PRODUCTS_DB');
  if (directDb !== undefined) return directDb;

  const source =
    (
      envValue('PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      envValue('MONGODB_ACTIVE_SOURCE') ??
      envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      'local'
    )
      .toLowerCase();

  if (source === 'cloud') {
    const db =
      envValue('PRODUCTS_MONGODB_CLOUD_DB') ??
      envValue('MONGODB_PRODUCTS_CLOUD_DB');
    if (db !== undefined) return db;
  }

  return (
    envValue('PRODUCTS_MONGODB_LOCAL_DB') ??
    envValue('MONGODB_PRODUCTS_LOCAL_DB') ??
    DEFAULT_ECOM_MONGODB_DB
  );
}

function resolveEcommerceProductsMongoUri(): string {
  const directUri = envValue('ECOM_MONGODB_URI') ?? envValue('MONGODB_ECOM_URI');
  if (directUri !== undefined) return directUri;

  const source =
    (
      envValue('ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      envValue('MONGODB_ACTIVE_SOURCE') ??
      envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      'local'
    )
      .toLowerCase();

  if (source === 'cloud') {
    const uri =
      envValue('ECOM_MONGODB_CLOUD_URI') ??
      envValue('MONGODB_ECOM_CLOUD_URI');
    if (uri !== undefined) return uri;
  }

  return (
    envValue('ECOM_MONGODB_LOCAL_URI') ??
    envValue('MONGODB_ECOM_LOCAL_URI') ??
    DEFAULT_ECOM_MONGODB_URI
  );
}

function resolveEcommerceProductsMongoDb(): string {
  const directDb = envValue('ECOM_MONGODB_DB') ?? envValue('MONGODB_ECOM_DB');
  if (directDb !== undefined) return directDb;

  const source =
    (
      envValue('ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      envValue('MONGODB_ACTIVE_SOURCE') ??
      envValue('MONGODB_ACTIVE_SOURCE_DEFAULT') ??
      'local'
    )
      .toLowerCase();

  if (source === 'cloud') {
    const db =
      envValue('ECOM_MONGODB_CLOUD_DB') ??
      envValue('MONGODB_ECOM_CLOUD_DB');
    if (db !== undefined) return db;
  }

  return (
    envValue('ECOM_MONGODB_LOCAL_DB') ??
    envValue('MONGODB_ECOM_LOCAL_DB') ??
    DEFAULT_ECOM_MONGODB_DB
  );
}

const clientCache = new Map<string, MongoClient>();

function getClient(uri: string, label: string): MongoClient {
  if (!uri) {
    throw new Error(
      `No ${label} MongoDB URI configured. Set MONGODB_URI, MONGODB_LOCAL_URI, or ECOM_MONGODB_LOCAL_URI in apps/ecom-web/.env.local`
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

export function hasEcommerceProductsMongoConfig(): boolean {
  return Boolean(resolveEcommerceProductsMongoUri());
}

export async function getEcommerceProductsDb(): Promise<Db> {
  const c = getClient(resolveEcommerceProductsMongoUri(), 'ecommerce products');
  await c.connect();
  return c.db(resolveEcommerceProductsMongoDb());
}

export async function getEcomAuthDb(): Promise<Db> {
  return getDb();
}

export async function closeMongoClients(): Promise<void> {
  const clients = Array.from(clientCache.values());
  clientCache.clear();
  await Promise.all(clients.map((client) => client.close()));
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
