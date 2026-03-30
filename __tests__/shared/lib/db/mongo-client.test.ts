/**
 * @vitest-environment node
 */

import { createRequire as actualCreateRequire } from 'module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/shared/lib/db/mongo-client');

type FakeMongoClientInstance = {
  uri: string;
  options: Record<string, unknown>;
  connect: ReturnType<typeof vi.fn>;
  db: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
};

const clearMongoGlobals = (): void => {
  delete (globalThis as typeof globalThis & { __mongoClient?: unknown }).__mongoClient;
  delete (globalThis as typeof globalThis & { __mongoClientPromise?: unknown }).__mongoClientPromise;
  delete (globalThis as typeof globalThis & { __mongoUri?: unknown }).__mongoUri;
};

const flushAsyncWork = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 25));
};

const loadMongoClientModule = async (options?: {
  env?: Record<string, string | undefined>;
  connectOutcomes?: Array<'self' | Error>;
}) => {
  vi.resetModules();
  clearMongoGlobals();

  const env = options?.env ?? {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const connectOutcomes = [...(options?.connectOutcomes ?? [])];
  const instances: FakeMongoClientInstance[] = [];
  const logSystemEventMock = vi.fn().mockResolvedValue(undefined);
  const reportRuntimeCatchMock = vi.fn().mockResolvedValue(undefined);

  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: logSystemEventMock,
  }));

  vi.doMock('@/shared/utils/observability/runtime-error-reporting', () => ({
    reportRuntimeCatch: reportRuntimeCatchMock,
  }));

  vi.doMock('module', () => {
    const mockedCreateRequire = (url: string | URL) => {
      const realRequire = actualCreateRequire(url);
      return (specifier: string) => {
        if (specifier === 'mongodb') {
          class FakeMongoClient {
            uri: string;
            options: Record<string, unknown>;
            handlers = new Map<string, Array<(payload: unknown) => void>>();
            connect = vi.fn(async () => {
              const nextOutcome = connectOutcomes.shift() ?? 'self';
              if (nextOutcome instanceof Error) {
                throw nextOutcome;
              }
              return this;
            });
            db = vi.fn((name: string) => ({
              name,
              clientUri: this.uri,
            }));
            on = vi.fn((event: string, listener: (payload: unknown) => void) => {
              const current = this.handlers.get(event) ?? [];
              current.push(listener);
              this.handlers.set(event, current);
              return this;
            });

            constructor(uri: string, clientOptions?: Record<string, unknown>) {
              this.uri = uri;
              this.options = clientOptions ?? {};
              instances.push({
                uri,
                options: this.options,
                connect: this.connect,
                db: this.db,
                on: this.on,
                emit: (event: string, payload: unknown) => {
                  for (const listener of this.handlers.get(event) ?? []) {
                    listener(payload);
                  }
                },
              });
            }
          }

          return {
            MongoClient: FakeMongoClient,
          };
        }

        return realRequire(specifier);
      };
    };

    return {
      createRequire: mockedCreateRequire,
      default: {
        createRequire: mockedCreateRequire,
      },
    };
  });

  const module = await import('@/shared/lib/db/mongo-client');
  const observabilityModule = await import('@/shared/lib/observability/system-logger');
  return {
    module,
    instances,
    logSystemEventMock: vi.mocked(observabilityModule.logSystemEvent),
    reportRuntimeCatchMock,
  };
};

describe('mongo-client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    clearMongoGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    clearMongoGlobals();
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('throws when MONGODB_URI is not configured', async () => {
    const { module } = await loadMongoClientModule({
      env: {
        MONGODB_URI: undefined,
      },
    });

    await expect(module.getMongoClient()).rejects.toThrow('MONGODB_URI is not set.');
  });

  it('caches the connected client and resolves the configured database', async () => {
    const { module, instances } = await loadMongoClientModule({
      env: {
        MONGODB_URI: 'mongodb://first-host:27017/app',
        MONGODB_DB: 'warehouse',
        MONGODB_MAX_POOL_SIZE: '40',
        MONGODB_MIN_POOL_SIZE: '0',
        MONGODB_SERVER_SELECTION_TIMEOUT_MS: '9000',
      },
    });

    const firstClient = await module.getMongoClient();
    const secondClient = await module.getMongoClient();
    const db = await module.getMongoDb();

    expect(firstClient).toBe(secondClient);
    expect(instances).toHaveLength(1);
    expect(instances[0]?.uri).toBe('mongodb://first-host:27017/app');
    expect(instances[0]?.options).toEqual(
      expect.objectContaining({
        maxPoolSize: 40,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 9000,
        retryWrites: true,
      })
    );
    expect(instances[0]?.db).toHaveBeenCalledWith('warehouse');
    expect(db).toEqual({
      name: 'warehouse',
      clientUri: 'mongodb://first-host:27017/app',
    });
  });

  it('creates a new client when the configured URI changes', async () => {
    const { module, instances } = await loadMongoClientModule({
      env: {
        MONGODB_URI: 'mongodb://first-host:27017/app',
      },
    });

    const firstClient = await module.getMongoClient();
    process.env['MONGODB_URI'] = 'mongodb://second-host:27017/app';
    const secondClient = await module.getMongoClient();

    expect(firstClient).not.toBe(secondClient);
    expect(instances).toHaveLength(2);
    expect(instances[0]?.uri).toBe('mongodb://first-host:27017/app');
    expect(instances[1]?.uri).toBe('mongodb://second-host:27017/app');
  });

  it('reports failed connections and retries on the next call', async () => {
    const connectError = new Error('connect failed');
    const { module, instances, reportRuntimeCatchMock } = await loadMongoClientModule({
      env: {
        MONGODB_URI: 'mongodb://retry-host:27017/app',
      },
      connectOutcomes: [connectError, 'self'],
    });

    await expect(module.getMongoClient()).rejects.toBe(connectError);
    expect(reportRuntimeCatchMock).toHaveBeenCalledWith(
      connectError,
      expect.objectContaining({
        source: 'db.mongo-client',
        action: 'getMongoClient',
        hasMongoUri: true,
      })
    );
    expect(instances).toHaveLength(1);

    const retriedClient = await module.getMongoClient();
    expect(retriedClient).toBeDefined();
    expect(instances).toHaveLength(2);
  });

  it('attaches opt-in pool and command listeners and emits structured logs', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now');
    dateNowSpy
      .mockReturnValueOnce(100_000)
      .mockReturnValueOnce(105_000)
      .mockReturnValueOnce(106_000)
      .mockReturnValueOnce(107_000)
      .mockReturnValueOnce(108_000)
      .mockReturnValueOnce(109_000)
      .mockReturnValueOnce(110_000)
      .mockReturnValueOnce(141_000);

    const { module, instances, logSystemEventMock } = await loadMongoClientModule({
      env: {
        MONGODB_URI: 'mongodb://observed-host:27017/app',
        DEBUG_MONGODB_POOL: 'true',
        MONGODB_MONITOR_COMMANDS: 'true',
        MONGODB_SLOW_COMMAND_MS: '2500',
      },
    });

    await module.getMongoClient();
    const client = instances[0];

    expect(client?.on).toHaveBeenCalledTimes(6);

    client?.emit('connectionPoolCreated', { address: 'cluster-1' });
    client?.emit('connectionPoolCleared', { address: 'cluster-1' });
    client?.emit('connectionCheckOutFailed', { address: 'cluster-1', reason: 'timeout' });
    client?.emit('connectionClosed', {
      address: 'cluster-1',
      connectionId: 4,
      reason: 'stale',
    });
    client?.emit('commandFailed', {
      address: 'cluster-1',
      commandName: 'find',
      duration: 300,
      failure: new Error('query failed'),
    });
    client?.emit('commandSucceeded', {
      address: 'cluster-1',
      commandName: 'aggregate',
      duration: 3000,
    });
    client?.emit('commandSucceeded', {
      address: 'cluster-1',
      commandName: 'aggregate',
      duration: 3001,
    });
    client?.emit('commandSucceeded', {
      address: 'cluster-1',
      commandName: 'aggregate',
      duration: 3100,
    });

    await flushAsyncWork();

    expect(dateNowSpy).toHaveBeenCalledTimes(6);
    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'mongodb',
        message: 'MongoDB connection pool created for cluster-1',
      })
    );
  });
});
