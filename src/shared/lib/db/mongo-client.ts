/**
 * MongoDB Client Management
 * 
 * Centralized MongoDB connection management with observability.
 * Features:
 * - Connection pooling with configurable limits.
 * - Automatic reconnection and error recovery.
 * - Performance monitoring and slow query detection.
 * - Connection event logging and metrics.
 * - Multi-source database support (local, cloud) via MongoSource.
 * - Environment-based configuration for pool size and timeouts.
 * 
 * This module ensures reliable database connectivity with comprehensive 
 * monitoring and standardized error handling.
 */

import { createRequire } from 'module';

import { configurationError } from '@/shared/errors/app-error';

import type { Db } from 'mongodb';
import type { MongoClient } from 'mongodb';
import type { MongoClientOptions } from 'mongodb';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import type { MongoSource } from '@/shared/contracts/database';

/**
 * Parses a positive integer from environment variable with fallback.
 * 
 * @param value - Raw environment variable value.
 * @param fallback - Fallback value if missing or invalid.
 * @returns Parsed integer or fallback.
 */
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

/**
 * Cooldown period for logging repetitive pool events to prevent log spam.
 */
const POOL_LOG_COOLDOWN_MS = 30_000;

/** Threshold for considering a MongoDB command as "slow". */
const SLOW_COMMAND_THRESHOLD_MS = parsePositiveInt(process.env['MONGODB_SLOW_COMMAND_MS'], 3_000);

/** Whether to monitor all successful commands (very verbose). */
const MONITOR_COMMANDS = process.env['MONGODB_MONITOR_COMMANDS'] === 'true';

/** Whether to enable detailed connection pool logging. */
const DEBUG_MONGODB_POOL = process.env['DEBUG_MONGODB_POOL'] === 'true';

/** Default timeout for server selection. */
const DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;

/** Default timeout for initial connection. */
const DEFAULT_MONGO_CONNECT_TIMEOUT_MS = 5_000;

/** Tracks last log timestamp for specific event keys to enforce cooldowns. */
const poolLoggedAt = new Map<string, number>();

/**
 * Determines if an event should be emitted based on the cooldown policy.
 */
const shouldEmit = (key: string): boolean => {
  const now = Date.now();
  if (now - (poolLoggedAt.get(key) ?? 0) < POOL_LOG_COOLDOWN_MS) return false;
  poolLoggedAt.set(key, now);
  return true;
};

/**
 * Log MongoDB events to the system logger.
 * Uses dynamic import of the observability layer to avoid circular dependencies.
 * 
 * @param level - Log level ('info', 'warn', 'error').
 * @param message - Descriptive message.
 * @param context - Additional structured data for the log.
 */
const mongoLog = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown>
): void => {
  void import('@/shared/lib/observability/system-logger')
    .then(({ logSystemEvent }) => logSystemEvent({ level, source: 'mongodb', message, context }))
    .catch(() => {});
};

/** Set of clients that have already had observability attached. */
const instrumented = new WeakSet<object>();

/** Event payloads supported by the MongoDB driver client. */
type MongoClientEventMap = {
  connectionPoolCreated: { address: string };
  connectionPoolCleared: { address: string; serviceId?: unknown };
  connectionCheckOutFailed: { reason: string; address: string };
  connectionClosed: { connectionId: number; reason: string; address: string };
  commandFailed: { commandName: string; duration: number; address: string; failure: Error };
  commandSucceeded: { commandName: string; duration: number; address: string };
};

/** Extended MongoClient type with typed event listeners. */
type ObservableMongoClient = MongoClient & {
  on<TEvent extends keyof MongoClientEventMap>(
    event: TEvent,
    listener: (payload: MongoClientEventMap[TEvent]) => void
  ): ObservableMongoClient;
};

/**
 * Attaches observability listeners to a MongoClient instance.
 * Handles connection pool events, command failures, and slow query detection.
 * 
 * @param client - The MongoClient to instrument.
 */
const attachMongoObservability = (client: MongoClient): void => {
  if (instrumented.has(client)) return;
  instrumented.add(client);
  const observableClient = client as ObservableMongoClient;

  // --- Connection pool events (opt-in via DEBUG_MONGODB_POOL=true) ---
  if (DEBUG_MONGODB_POOL) {
    observableClient.on('connectionPoolCreated', (e) => {
      mongoLog('info', `MongoDB connection pool created for ${e.address}`, {
        event: 'connectionPoolCreated',
        address: e.address,
      });
    });

    observableClient.on('connectionPoolCleared', (e) => {
      const key = `poolCleared:${e.address}`;
      if (!shouldEmit(key)) return;
      mongoLog('warn', `MongoDB connection pool cleared for ${e.address}`, {
        event: 'connectionPoolCleared',
        address: e.address,
      });
    });

    observableClient.on('connectionCheckOutFailed', (e) => {
      const key = `checkOutFailed:${e.address}:${e.reason}`;
      if (!shouldEmit(key)) return;
      mongoLog('warn', `MongoDB connection check-out failed: ${e.reason}`, {
        event: 'connectionCheckOutFailed',
        reason: e.reason,
        address: e.address,
      });
    });

    observableClient.on('connectionClosed', (e) => {
      const key = `connClosed:${e.address}:${e.reason}`;
      if (!shouldEmit(key)) return;
      mongoLog('info', `MongoDB connection closed: ${e.reason}`, {
        event: 'connectionClosed',
        connectionId: e.connectionId,
        reason: e.reason,
        address: e.address,
      });
    });
  }

  // --- Command monitoring (Always enabled for failures, opt-in for all successes) ---
  observableClient.on('commandFailed', (e) => {
    mongoLog('error', `MongoDB command failed: ${e.commandName} (${e.duration}ms)`, {
      event: 'commandFailed',
      commandName: e.commandName,
      durationMs: e.duration,
      address: e.address,
      error: e.failure?.message,
      stack: e.failure?.stack,
    });
  });

  observableClient.on('commandSucceeded', (e) => {
    const isSlow = e.duration >= SLOW_COMMAND_THRESHOLD_MS;
    if (!isSlow && !MONITOR_COMMANDS) return;

    const key = `cmdSucceeded:${e.commandName}:${isSlow ? 'slow' : 'normal'}`;
    if (isSlow && !shouldEmit(key)) return;

    mongoLog(
      isSlow ? 'warn' : 'info',
      `MongoDB command ${isSlow ? 'slow' : 'succeeded'}: ${e.commandName} (${e.duration}ms)`,
      {
        event: 'commandSucceeded',
        commandName: e.commandName,
        durationMs: e.duration,
        address: e.address,
        thresholdMs: SLOW_COMMAND_THRESHOLD_MS,
        isSlow,
      }
    );
  });
};

/** Constructor type for MongoClient. */
type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;

/** Global state structure for caching MongoDB clients in hot-reloading environments (Next.js). */
type MongoGlobalState = {
  __mongoClientByKey?: Map<string, MongoClient>;
  __mongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForMongo = globalThis as typeof globalThis & MongoGlobalState;

/**
 * Resolves the MongoClient constructor using standard Node require.
 * This prevents bundlers from trying to inline heavy MongoDB internals.
 */
const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  const requireFn = createRequire(import.meta.url);
  return requireFn('mongodb') as { MongoClient: MongoClientCtor };
};

/** Retrieves the primary MongoDB URI from environment. */
const getMongoUri = (): string => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw configurationError('MONGODB_URI is not set.');
  }
  return uri;
};

/**
 * Checks if a URI targets a local single-node instance.
 * Useful for enabling directConnection when no replica set is present.
 */
const isSingleNodeLocalMongoUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (hostname === '127.0.0.1' || hostname === 'localhost') && !parsed.searchParams.has('replicaSet');
  } catch {
    return false;
  }
};

/**
 * Builds the MongoClientOptions based on environment variables.
 */
const getMongoClientOptions = (): MongoClientOptions => {
  const uri = getMongoUri();

  return {
    maxPoolSize: parsePositiveInt(process.env['MONGODB_MAX_POOL_SIZE'], 20),
    minPoolSize: parsePositiveInt(process.env['MONGODB_MIN_POOL_SIZE'], 1),
    maxIdleTimeMS: parsePositiveInt(process.env['MONGODB_MAX_IDLE_TIME_MS'], 60_000),
    serverSelectionTimeoutMS: parsePositiveInt(
      process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
      DEFAULT_MONGO_SERVER_SELECTION_TIMEOUT_MS
    ),
    connectTimeoutMS: parsePositiveInt(
      process.env['MONGODB_CONNECT_TIMEOUT_MS'],
      DEFAULT_MONGO_CONNECT_TIMEOUT_MS
    ),
    socketTimeoutMS: parsePositiveInt(process.env['MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
    retryWrites: true,
    ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
    // Always enable command monitoring to capture failures and slow queries.
    monitorCommands: true,
  };
};

export const __testOnly = {
  getMongoClientOptions,
  isSingleNodeLocalMongoUri,
};

/** Accesses the global client instance cache. */
const getMongoClientByKeyStore = (): Map<string, MongoClient> => {
  if (!globalForMongo.__mongoClientByKey) {
    globalForMongo.__mongoClientByKey = new Map<string, MongoClient>();
  }
  return globalForMongo.__mongoClientByKey;
};

/** Accesses the global pending connection promise cache. */
const getMongoClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  if (!globalForMongo.__mongoClientPromiseByKey) {
    globalForMongo.__mongoClientPromiseByKey = new Map<string, Promise<MongoClient>>();
  }
  return globalForMongo.__mongoClientPromiseByKey;
};

/**
 * Safely closes a MongoClient and reports any errors.
 */
const closeMongoClientSafely = async (
  client: MongoClient,
  context: 'cached-client' | 'pending-client'
): Promise<void> => {
  try {
    await client.close();
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.mongo-client',
      action: 'invalidateMongoClientCache',
      context,
    });
  }
};

/**
 * Invalidates and closes all cached MongoDB clients.
 * Useful during application shutdown or configuration changes.
 */
export async function invalidateMongoClientCache(): Promise<void> {
  const clientByKey = getMongoClientByKeyStore();
  const clientPromiseByKey = getMongoClientPromiseByKeyStore();
  const cachedClients = new Set<MongoClient>(clientByKey.values());
  const pendingClientPromises = [...clientPromiseByKey.values()];

  clientByKey.clear();
  clientPromiseByKey.clear();

  // Close established clients.
  await Promise.allSettled(
    [...cachedClients].map((client) => closeMongoClientSafely(client, 'cached-client'))
  );

  // Handle pending promises to ensure they don't leak clients.
  pendingClientPromises.forEach((clientPromise) => {
    void clientPromise
      .then(async (client) => {
        if (cachedClients.has(client)) return;
        await closeMongoClientSafely(client, 'pending-client');
      })
      .catch(() => undefined);
  });
}

/**
 * Retrieves an established MongoClient instance for the specified source.
 * 
 * This function serves as the entry point for all MongoDB interactions. It implements:
 * 1. Source-aware URI resolution: Uses environment variables or explicit source overrides.
 * 2. Connection Caching: Clients are cached per URI and source using a global `Map`, 
 *    preventing excessive connection creation, which is vital in hot-reloading (Next.js) environments.
 * 3. Concurrent Request Deduplication: Uses a `Map` of promises to ensure that multiple
 *    simultaneous calls for the same database configuration result in only a single connection attempt.
 * 4. Observability Instrumentation: Every new connection is instrumented with event listeners 
 *    that report command performance, failures, and pool status to the system logger.
 * 
 * @param preferredSource - Optional configuration override (e.g., local vs cloud).
 * @returns A promise that resolves to an active, connected MongoClient instance.
 * @throws If MONGODB_URI is misconfigured or if connection establishment fails.
 */
export async function getMongoClient(preferredSource?: MongoSource): Promise<MongoClient> {
  const sourceConfig = await applyActiveMongoSourceEnv(preferredSource);
  const uri = getMongoUri();
  const clientCacheKey = `${sourceConfig.source}:${uri}`;
  const clientByKey = getMongoClientByKeyStore();
  const clientPromiseByKey = getMongoClientPromiseByKeyStore();

  // Return cached instance if available.
  const cachedClient = clientByKey.get(clientCacheKey);
  if (cachedClient) return cachedClient;

  // Deduplicate connection attempts: If an attempt is already in-flight, return the existing promise.
  if (!clientPromiseByKey.has(clientCacheKey)) {
    const { MongoClient } = getMongoClientCtor();
    clientPromiseByKey.set(clientCacheKey, new MongoClient(uri, getMongoClientOptions()).connect());
  }

  try {
    const resolvedClient = await clientPromiseByKey.get(clientCacheKey)!;
    clientByKey.set(clientCacheKey, resolvedClient);
    attachMongoObservability(resolvedClient);
    return resolvedClient;
  } catch (error) {
    // Log failures via runtime error reporting to maintain observability into connection issues.
    void reportRuntimeCatch(error, {
      source: 'db.mongo-client',
      action: 'getMongoClient',
      hasMongoUri: Boolean(process.env['MONGODB_URI']),
    });
    // Remove the failed promise so that subsequent calls can retry.
    clientPromiseByKey.delete(clientCacheKey);
    throw error;
  }
}

/**
 * Retrieves a MongoDB Db instance for the specified source.
 * 
 * This helper simplifies database access by wrapping `getMongoClient` and 
 * returning the specific database handle. It prioritizes the database name
 * resolved from the `preferredSource` configuration, falling back to 
 * `MONGODB_DB` or 'app'.
 * 
 * @param preferredSource - Optional configuration override for source routing.
 * @returns A handle to the target MongoDB database instance.
 */
export async function getMongoDb(preferredSource?: MongoSource): Promise<Db> {
  const sourceConfig = await applyActiveMongoSourceEnv(preferredSource);
  const dbName = sourceConfig.dbName || process.env['MONGODB_DB'] || 'app';
  const mongoClient = await getMongoClient(preferredSource);
  return mongoClient.db(dbName);
}
