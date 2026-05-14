/* eslint-disable max-lines */
import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

const DEFAULT_ECOM_MONGODB_URI = 'mongodb://127.0.0.1:27021/ecom_local';
const DEFAULT_ECOM_MONGODB_DB = 'ecom_local';

type MongoSource = 'local' | 'cloud';
type MongoConfig = { uri: string; dbName: string };
type MongoContext = 'main' | 'products' | 'ecommerce';
const insecureTlsWarnings = new Set<string>();

function envValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  if (value === undefined || value.length === 0) return undefined;
  return value;
}

function firstEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = envValue(key);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readMongoConfig(uriKeys: string[], dbKeys: string[]): Partial<MongoConfig> {
  return {
    uri: firstEnvValue(...uriKeys),
    dbName: firstEnvValue(...dbKeys),
  };
}

function databaseNameFromUri(uri: string | undefined): string | undefined {
  if (uri === undefined || uri.length === 0) return undefined;
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\/+/, '').trim();
    return dbName.length > 0 ? dbName : undefined;
  } catch {
    return undefined;
  }
}

function completeMongoConfig(config: Partial<MongoConfig>, fallbackDbName = DEFAULT_ECOM_MONGODB_DB): MongoConfig | null {
  if (config.uri === undefined) return null;
  return {
    uri: config.uri,
    dbName: config.dbName ?? databaseNameFromUri(config.uri) ?? fallbackDbName,
  };
}

function isVercelRuntime(): boolean {
  return envValue('VERCEL') !== undefined || envValue('VERCEL_ENV') !== undefined;
}

function isLoopbackMongoUri(uri: string | undefined): boolean {
  if (uri === undefined || uri.length === 0) return false;
  try {
    const hostname = new URL(uri).hostname.toLowerCase();
    return hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname === '::1';
  } catch {
    return false;
  }
}

function normalizeSource(value: string | undefined): MongoSource {
  return value?.toLowerCase() === 'cloud' ? 'cloud' : 'local';
}

function isTruthyEnv(value: string | undefined): boolean {
  const parsed = parseBooleanLike(value);
  return parsed === true;
}

// eslint-disable-next-line complexity
function parseBooleanLike(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
  return undefined;
}

function firstByPrefixes(prefixes: string[], suffix: string): string | undefined {
  for (const prefix of prefixes) {
    const value = envValue(`${prefix}_${suffix}`);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readNumberFromEnv(prefixes: string[], suffix: string, fallback: number): number {
  const value = firstByPrefixes(prefixes, suffix);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanFromEnv(prefixes: string[], suffix: string, fallback = false): boolean {
  const value = firstByPrefixes(prefixes, suffix);
  if (value === undefined) return fallback;
  return isTruthyEnv(value);
}

function isProductionLike(): boolean {
  const env = envValue('NODE_ENV');
  const vercelEnv = envValue('VERCEL_ENV');
  return env === 'production' || vercelEnv === 'production';
}

function getMongoOptionPrefixes(context: MongoContext): string[] {
  if (context === 'products') {
    return ['PRODUCTS_MONGODB', 'MONGODB_PRODUCTS', 'MONGODB'];
  }
  if (context === 'ecommerce') {
    return ['ECOM_MONGODB', 'MONGODB_ECOM', 'PRODUCTS_MONGODB', 'MONGODB_PRODUCTS', 'MONGODB'];
  }
  return ['MONGODB'];
}

// eslint-disable-next-line complexity
function normalizeClientOptionsForCache(options: MongoClientOptions): string {
  const payload: Record<string, unknown> = {
    maxPoolSize: options.maxPoolSize ?? 5,
    minPoolSize: options.minPoolSize ?? 1,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 10_000,
    connectTimeoutMS: options.connectTimeoutMS ?? 10_000,
    socketTimeoutMS: options.socketTimeoutMS ?? undefined,
    tls: options.tls ?? undefined,
    tlsAllowInvalidCertificates: options.tlsAllowInvalidCertificates ?? false,
    tlsAllowInvalidHostnames: options.tlsAllowInvalidHostnames ?? false,
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  return JSON.stringify(payload);
}

function buildMongoClientOptions(uri: string, context: MongoContext, allowInvalidCertificate: boolean): MongoClientOptions {
  const prefixes = getMongoOptionPrefixes(context);
  const defaultConnectionTimeout = !isProductionLike() && isLoopbackMongoUri(uri) ? 1_500 : 12_000;
  const options: MongoClientOptions = {
    maxPoolSize: readNumberFromEnv(prefixes, 'MAX_POOL_SIZE', 5),
    minPoolSize: readNumberFromEnv(prefixes, 'MIN_POOL_SIZE', 1),
    serverSelectionTimeoutMS: readNumberFromEnv(prefixes, 'SERVER_SELECTION_TIMEOUT_MS', defaultConnectionTimeout),
    connectTimeoutMS: readNumberFromEnv(prefixes, 'CONNECT_TIMEOUT_MS', defaultConnectionTimeout),
    socketTimeoutMS: readNumberFromEnv(prefixes, 'SOCKET_TIMEOUT_MS', 20_000),
  };

  const explicitTls = firstByPrefixes(prefixes, 'TLS');
  if (explicitTls !== undefined) {
    options.tls = isTruthyEnv(explicitTls);
  } else if (uri.startsWith('mongodb+srv://')) {
    options.tls = true;
  }

  if (allowInvalidCertificate) {
    options.tls = true;
    options.tlsAllowInvalidCertificates = true;
    const allowInvalidHostnames = readBooleanFromEnv(prefixes, 'TLS_ALLOW_INVALID_HOSTNAMES', false);
    options.tlsAllowInvalidHostnames = allowInvalidHostnames || allowInvalidCertificate;
  }

  return options;
}

function uriExplicitTls(uri: string): boolean | undefined {
  try {
    const parsed = new URL(uri);
    const explicitTls = parseBooleanLike(parsed.searchParams.get('tls') ?? parsed.searchParams.get('ssl') ?? undefined);
    if (explicitTls !== undefined) return explicitTls;
  } catch {
    return undefined;
  }
  return undefined;
}

function isTlsEnabledForClient(uri: string, optionTls: boolean | undefined): boolean {
  const explicitUriTls = uriExplicitTls(uri);
  if (explicitUriTls !== undefined) return explicitUriTls;
  return Boolean(optionTls);
}

// eslint-disable-next-line complexity
function isTlsHandshakeError(error: unknown): boolean {
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  if (message.length === 0) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('ssl routines') ||
    normalized.includes('tlsv1 alert internal error') ||
    normalized.includes('ssl handshake') ||
    normalized.includes('tls handshake') ||
    normalized.includes('alert internal error') ||
    normalized.includes('certificate') ||
    normalized.includes('certificate verify') ||
    normalized.includes('x509') ||
    normalized.includes('ca certificate') ||
    normalized.includes('self signed') ||
    normalized.includes('unknown ca');
}

// eslint-disable-next-line complexity
function isRetryableMongoConnectionError(error: unknown): boolean {
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  if (message.length === 0) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('server selection') ||
    normalized.includes('server selection timed out') ||
    normalized.includes('connect timed out') ||
    normalized.includes('connecttimeoutms') ||
    normalized.includes('connect timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('socket hang up') ||
    normalized.includes('connection timed out') ||
    normalized.includes('connection refused') ||
    normalized.includes('econnrefused') ||
    normalized.includes('enotfound') ||
    normalized.includes('enetunreach') ||
    normalized.includes('eai_again') ||
    isTlsHandshakeError(error);
}

function shouldRetryWithInsecureCertificates(context: MongoContext, tlsEnabled: boolean): boolean {
  if (!tlsEnabled) return false;
  const prefixes = getMongoOptionPrefixes(context);
  const overrideEnabled = readBooleanFromEnv(prefixes, 'SECURITY_OVERRIDE_ENABLED', false);
  if (!overrideEnabled) return false;
  const allow = readBooleanFromEnv(prefixes, 'TLS_ALLOW_INVALID_CERTIFICATES', false);
  if (!allow) return false;
  if (!isProductionLike()) return true;
  return readBooleanFromEnv(prefixes, 'TLS_ALLOW_INVALID_CERTIFICATES_IN_PRODUCTION', false);
}

function warnInsecureTlsUsed(context: MongoContext, uri: string): void {
  const key = `${context}::${uri}`;
  if (insecureTlsWarnings.has(key)) return;
  insecureTlsWarnings.add(key);
  if (isProductionLike()) {
    // Production mode logs are handled by platform observability.
  } else {
    // Local debugging uses fallback logic to continue operation.
  }
}

async function connectWithCachedClient(
  uri: string,
  context: MongoContext,
  options: MongoClientOptions,
): Promise<MongoClient> {
  const key = `${uri}::${normalizeClientOptionsForCache(options)}::${context}`;
  const existing = clientCache.get(key);
  if (existing) return existing;

  const client = new MongoClient(uri, options);
  try {
    await client.connect();
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }

  clientCache.set(key, client);
  return client;
}

async function getClient(uri: string, context: MongoContext): Promise<MongoClient> {
  const initial = buildMongoClientOptions(uri, context, false);
  try {
    return await connectWithCachedClient(uri, context, initial);
  } catch (error) {
    if (!shouldRetryWithInsecureCertificates(context, isTlsEnabledForClient(uri, initial.tls)) || !isTlsHandshakeError(error)) {
      throw error;
    }
    const fallback = buildMongoClientOptions(uri, context, true);
    if (normalizeClientOptionsForCache(fallback) === normalizeClientOptionsForCache(initial)) {
      throw error;
    }
    warnInsecureTlsUsed(context, uri);
    return connectWithCachedClient(uri, context, fallback);
  }
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

// eslint-disable-next-line complexity
function resolveMongoConfigCandidates(): MongoConfig[] {
  const source = normalizeSource(
    firstEnvValue(
      'MONGODB_ACTIVE_SOURCE',
      'MONGODB_ACTIVE_SOURCE_DEFAULT',
    ),
  );

  const directConfig = completeMongoConfig(readMongoConfig(
    ['MONGODB_URI'],
    ['MONGODB_DB'],
  ));
  const localConfig = completeMongoConfig(readMongoConfig(
    ['MONGODB_LOCAL_URI'],
    ['MONGODB_LOCAL_DB'],
  ));
  const cloudConfig = completeMongoConfig(readMongoConfig(
    ['MONGODB_CLOUD_URI'],
    ['MONGODB_CLOUD_DB'],
  ));

  const primary = {
    uri: resolveMongoUri(),
    dbName: resolveMongoDb(),
  };
  const allowAlternateSourceFallback = readBooleanFromEnv(
    getMongoOptionPrefixes('main'),
    'FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR',
    false,
  );
  const candidates: MongoConfig[] = [primary];

  if (!allowAlternateSourceFallback || isProductionLike() || directConfig) {
    return candidates;
  }

  const shouldTryLocalFallback = source === 'cloud' && localConfig !== null && localConfig.uri !== primary.uri;
  const shouldTryCloudFallback =
    source === 'local' && isVercelRuntime() && isLoopbackMongoUri(primary.uri) && cloudConfig !== null && cloudConfig.uri !== primary.uri;

  const addUnique = (config: MongoConfig | null | undefined): void => {
    if (!config) return;
    const exists = candidates.some((entry) => entry.uri === config.uri && entry.dbName === config.dbName);
    if (!exists) candidates.push(config);
  };

  if (shouldTryLocalFallback) addUnique(localConfig);
  if (shouldTryCloudFallback) addUnique(cloudConfig);

  return candidates;
}

export function hasMongoConfig(): boolean {
  return Boolean(resolveMongoUri());
}

// eslint-disable-next-line complexity
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

// eslint-disable-next-line complexity
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
  return resolveEcommerceProductsMongoConfig().uri;
}

function shouldPinEcommerceToLocalDevelopment(): boolean {
  return !isProductionLike() && !isVercelRuntime();
}

// eslint-disable-next-line complexity, max-lines-per-function
function resolveEcommerceProductsMongoConfig(): MongoConfig {
  const directConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_URI',
      'MONGODB_ECOM_URI',
      'PRODUCTS_MONGODB_URI',
      'MONGODB_PRODUCTS_URI',
    ],
    [
      'ECOM_MONGODB_DB',
      'MONGODB_ECOM_DB',
      'PRODUCTS_MONGODB_DB',
      'MONGODB_PRODUCTS_DB',
    ],
  ));
  if (directConfig) return directConfig;

  const source = normalizeSource(
    firstEnvValue(
      'ECOM_MONGODB_ACTIVE_SOURCE',
      'ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT',
      'PRODUCTS_MONGODB_ACTIVE_SOURCE',
      'PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT',
      'MONGODB_ACTIVE_SOURCE',
      'MONGODB_ACTIVE_SOURCE_DEFAULT',
    ),
  );
  const localConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_LOCAL_URI',
      'MONGODB_ECOM_LOCAL_URI',
      'PRODUCTS_MONGODB_LOCAL_URI',
      'MONGODB_PRODUCTS_LOCAL_URI',
      'MONGODB_LOCAL_URI',
    ],
    [
      'ECOM_MONGODB_LOCAL_DB',
      'MONGODB_ECOM_LOCAL_DB',
      'PRODUCTS_MONGODB_LOCAL_DB',
      'MONGODB_PRODUCTS_LOCAL_DB',
      'MONGODB_LOCAL_DB',
    ],
  ));
  const cloudConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_CLOUD_URI',
      'MONGODB_ECOM_CLOUD_URI',
      'PRODUCTS_MONGODB_CLOUD_URI',
      'MONGODB_PRODUCTS_CLOUD_URI',
      'MONGODB_CLOUD_URI',
    ],
    [
      'ECOM_MONGODB_CLOUD_DB',
      'MONGODB_ECOM_CLOUD_DB',
      'PRODUCTS_MONGODB_CLOUD_DB',
      'MONGODB_PRODUCTS_CLOUD_DB',
      'MONGODB_CLOUD_DB',
    ],
  ));
  const genericFallbackConfig = completeMongoConfig(readMongoConfig(
    ['MONGODB_URI'],
    ['MONGODB_DB'],
  ));

  if (localConfig && shouldPinEcommerceToLocalDevelopment()) return localConfig;
  if (source === 'cloud' && cloudConfig) return cloudConfig;
  if (source === 'local' && isVercelRuntime() && isLoopbackMongoUri(localConfig?.uri) && cloudConfig) {
    return cloudConfig;
  }

  return localConfig ?? cloudConfig ?? genericFallbackConfig ?? {
    uri: DEFAULT_ECOM_MONGODB_URI,
    dbName: DEFAULT_ECOM_MONGODB_DB,
  };
}

// eslint-disable-next-line complexity, max-lines-per-function
function resolveEcommerceProductsMongoConfigCandidates(): MongoConfig[] {
  const source = normalizeSource(
    firstEnvValue(
      'ECOM_MONGODB_ACTIVE_SOURCE',
      'ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT',
      'PRODUCTS_MONGODB_ACTIVE_SOURCE',
      'PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT',
      'MONGODB_ACTIVE_SOURCE',
      'MONGODB_ACTIVE_SOURCE_DEFAULT',
    ),
  );

  const directConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_URI',
      'MONGODB_ECOM_URI',
      'PRODUCTS_MONGODB_URI',
      'MONGODB_PRODUCTS_URI',
    ],
    [
      'ECOM_MONGODB_DB',
      'MONGODB_ECOM_DB',
      'PRODUCTS_MONGODB_DB',
      'MONGODB_PRODUCTS_DB',
    ],
  ));
  const localConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_LOCAL_URI',
      'MONGODB_ECOM_LOCAL_URI',
      'PRODUCTS_MONGODB_LOCAL_URI',
      'MONGODB_PRODUCTS_LOCAL_URI',
      'MONGODB_LOCAL_URI',
    ],
    [
      'ECOM_MONGODB_LOCAL_DB',
      'MONGODB_ECOM_LOCAL_DB',
      'PRODUCTS_MONGODB_LOCAL_DB',
      'MONGODB_PRODUCTS_LOCAL_DB',
      'MONGODB_LOCAL_DB',
    ],
  ));
  const cloudConfig = completeMongoConfig(readMongoConfig(
    [
      'ECOM_MONGODB_CLOUD_URI',
      'MONGODB_ECOM_CLOUD_URI',
      'PRODUCTS_MONGODB_CLOUD_URI',
      'MONGODB_PRODUCTS_CLOUD_URI',
      'MONGODB_CLOUD_URI',
    ],
    [
      'ECOM_MONGODB_CLOUD_DB',
      'MONGODB_ECOM_CLOUD_DB',
      'PRODUCTS_MONGODB_CLOUD_DB',
      'MONGODB_PRODUCTS_CLOUD_DB',
      'MONGODB_CLOUD_DB',
    ],
  ));
  const genericFallbackConfig = completeMongoConfig(readMongoConfig(
    ['MONGODB_URI'],
    ['MONGODB_DB'],
  ));

  if (localConfig && shouldPinEcommerceToLocalDevelopment()) return [localConfig];

  const primary = resolveEcommerceProductsMongoConfig();
  const allowAlternateSourceFallback = readBooleanFromEnv(
    getMongoOptionPrefixes('ecommerce'),
    'FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR',
    false,
  );
  const candidates: MongoConfig[] = [primary];

  if (!allowAlternateSourceFallback || isProductionLike() || directConfig) {
    return candidates;
  }

  const shouldTryLocalFallback = source === 'cloud' && localConfig !== null && localConfig.uri !== primary.uri;
  const shouldTryCloudFallback =
    source === 'local' && isVercelRuntime() && isLoopbackMongoUri(primary.uri) && cloudConfig !== null && cloudConfig.uri !== primary.uri;

  const addUnique = (config: MongoConfig | null | undefined): void => {
    if (!config) return;
    const exists = candidates.some((entry) => entry.uri === config.uri && entry.dbName === config.dbName);
    if (!exists) candidates.push(config);
  };

  if (shouldTryLocalFallback) addUnique(localConfig);
  if (shouldTryCloudFallback) addUnique(cloudConfig);
  addUnique(genericFallbackConfig);

  return candidates;
}

const clientCache = new Map<string, MongoClient>();

function assertMongoUri(uri: string, label: string): void {
  if (uri.length === 0) {
    throw new Error(
      `No ${label} MongoDB URI configured. Set MONGODB_URI, MONGODB_LOCAL_URI, or ECOM_MONGODB_LOCAL_URI in apps/ecom-web/.env.local`
    );
  }
}

export async function getDb(): Promise<Db> {
  const candidates = resolveMongoConfigCandidates();
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const config = candidates[i];
    assertMongoUri(config.uri, 'main');
    try {
      // eslint-disable-next-line no-await-in-loop
      const c = await getClient(config.uri, 'main');
      return c.db(config.dbName);
    } catch (error) {
      lastError = error;
      const hasNextCandidate = i + 1 < candidates.length;
      if (!isRetryableMongoConnectionError(error) || !hasNextCandidate) {
        throw error;
      }

      if (!isProductionLike()) {
        // Non-production: continue with next configured MongoDB candidate.
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('Unable to connect to MongoDB with configured sources.');
}

export function hasProductsMongoConfig(): boolean {
  return Boolean(resolveProductsMongoUri());
}

export async function getProductsDb(): Promise<Db> {
  const uri = resolveProductsMongoUri();
  assertMongoUri(uri, 'products');
  const c = await getClient(uri, 'products');
  return c.db(resolveProductsMongoDb());
}

export function hasEcommerceProductsMongoConfig(): boolean {
  return Boolean(resolveEcommerceProductsMongoUri());
}

export async function getEcommerceProductsDb(): Promise<Db> {
  const candidates = resolveEcommerceProductsMongoConfigCandidates();
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const config = candidates[i];
    assertMongoUri(config.uri, 'ecommerce products');
    try {
      // eslint-disable-next-line no-await-in-loop
      const c = await getClient(config.uri, 'ecommerce');
      return c.db(config.dbName);
    } catch (error) {
      lastError = error;
      const hasNextCandidate = i + 1 < candidates.length;
      if (!isRetryableMongoConnectionError(error) || !hasNextCandidate) {
        throw error;
      }

      if (!isProductionLike()) {
        // Non-production: continue with next configured MongoDB candidate.
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('Unable to connect to ecommerce MongoDB with configured sources.');
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
  if (resolveMongoUri().length === 0) return false;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
/* eslint-enable max-lines */
