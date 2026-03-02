/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { createRequire } from 'module';

import { configurationError } from '@/shared/errors/app-error';

import type { Db } from 'mongodb';
import type { MongoClient } from 'mongodb';
import type { MongoClientOptions } from 'mongodb';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

// ---------------------------------------------------------------------------
// Observability helpers — dynamic import to avoid circular dependency with the
// observability layer (which itself may use MongoDB for storage).
// ---------------------------------------------------------------------------

const POOL_LOG_COOLDOWN_MS = 30_000; // suppress repeated events of the same type
const SLOW_COMMAND_THRESHOLD_MS = parsePositiveInt(
  process.env['MONGODB_SLOW_COMMAND_MS'],
  3_000
);
const MONITOR_COMMANDS = process.env['MONGODB_MONITOR_COMMANDS'] === 'true';

const poolLoggedAt = new Map<string, number>();
const shouldEmit = (key: string): boolean => {
  const now = Date.now();
  if ((now - (poolLoggedAt.get(key) ?? 0)) < POOL_LOG_COOLDOWN_MS) return false;
  poolLoggedAt.set(key, now);
  return true;
};

const mongoLog = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown>
): void => {
  void import('@/shared/lib/observability/system-logger')
    .then(({ logSystemEvent }) =>
      logSystemEvent({ level, source: 'mongodb', message, context })
    )
    .catch(() => {});
};

// Track which clients already have listeners so we never double-attach.
const instrumented = new WeakSet<object>();

const attachMongoObservability = (client: MongoClient): void => {
  if (instrumented.has(client)) return;
  instrumented.add(client);

  // --- Connection pool events (always available) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).on('connectionPoolCreated', (e: { address: string }) => {
    mongoLog('info', `MongoDB connection pool created for ${e.address}`, {
      event: 'connectionPoolCreated',
      address: e.address,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).on('connectionPoolCleared', (e: { address: string; serviceId?: unknown }) => {
    const key = `poolCleared:${e.address}`;
    if (!shouldEmit(key)) return;
    mongoLog('warn', `MongoDB connection pool cleared for ${e.address}`, {
      event: 'connectionPoolCleared',
      address: e.address,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).on('connectionCheckOutFailed', (e: { reason: string; address: string }) => {
    const key = `checkOutFailed:${e.address}:${e.reason}`;
    if (!shouldEmit(key)) return;
    mongoLog('warn', `MongoDB connection check-out failed: ${e.reason}`, {
      event: 'connectionCheckOutFailed',
      reason: e.reason,
      address: e.address,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).on('connectionClosed', (e: { connectionId: number; reason: string; address: string }) => {
    const key = `connClosed:${e.address}:${e.reason}`;
    if (!shouldEmit(key)) return;
    mongoLog('info', `MongoDB connection closed: ${e.reason}`, {
      event: 'connectionClosed',
      connectionId: e.connectionId,
      reason: e.reason,
      address: e.address,
    });
  });

  // --- Command monitoring (opt-in via MONGODB_MONITOR_COMMANDS=true) ---
  if (MONITOR_COMMANDS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).on(
      'commandFailed',
      (e: { commandName: string; duration: number; address: string; failure: Error }) => {
        mongoLog('warn', `MongoDB command failed: ${e.commandName} (${e.duration}ms)`, {
          event: 'commandFailed',
          commandName: e.commandName,
          durationMs: e.duration,
          address: e.address,
          error: e.failure?.message,
        });
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).on(
      'commandSucceeded',
      (e: { commandName: string; duration: number; address: string }) => {
        if (e.duration < SLOW_COMMAND_THRESHOLD_MS) return;
        const key = `slowCmd:${e.commandName}`;
        if (!shouldEmit(key)) return;
        mongoLog('warn', `MongoDB slow command: ${e.commandName} took ${e.duration}ms`, {
          event: 'commandSucceeded',
          commandName: e.commandName,
          durationMs: e.duration,
          address: e.address,
          thresholdMs: SLOW_COMMAND_THRESHOLD_MS,
        });
      }
    );
  }
};

type MongoClientCtor = new (uri: string, options?: MongoClientOptions) => MongoClient;
type MongoGlobalState = {
  __mongoClient?: MongoClient;
  __mongoClientPromise?: Promise<MongoClient>;
  __mongoUri?: string;
};

const globalForMongo = globalThis as typeof globalThis & MongoGlobalState;

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
    throw configurationError('MONGODB_URI is not set.');
  }
  return uri;
};

const getMongoClientOptions = (): MongoClientOptions => ({
  maxPoolSize: parsePositiveInt(process.env['MONGODB_MAX_POOL_SIZE'], 20),
  minPoolSize: parsePositiveInt(process.env['MONGODB_MIN_POOL_SIZE'], 1),
  maxIdleTimeMS: parsePositiveInt(process.env['MONGODB_MAX_IDLE_TIME_MS'], 60_000),
  serverSelectionTimeoutMS: parsePositiveInt(
    process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'],
    5_000
  ),
  connectTimeoutMS: parsePositiveInt(process.env['MONGODB_CONNECT_TIMEOUT_MS'], 5_000),
  socketTimeoutMS: parsePositiveInt(process.env['MONGODB_SOCKET_TIMEOUT_MS'], 120_000),
  retryWrites: true,
  // Enable command monitoring only when explicitly opted in (adds minor overhead).
  ...(MONITOR_COMMANDS ? { monitorCommands: true } : {}),
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
    attachMongoObservability(globalForMongo.__mongoClient);
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
