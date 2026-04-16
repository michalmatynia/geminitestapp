/**
 * @vitest-environment node
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/shared/lib/db/mongo-client');

type MongoClientCacheTestDouble = {
  close: ReturnType<typeof vi.fn<() => Promise<void>>>;
};

type MongoClientGlobalState = typeof globalThis & {
  __mongoClientByKey?: Map<string, MongoClientCacheTestDouble>;
  __mongoClientPromiseByKey?: Map<string, Promise<MongoClientCacheTestDouble>>;
};

describe('mongo-client defaults', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalServerSelectionTimeout = process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'];
  const originalConnectTimeout = process.env['MONGODB_CONNECT_TIMEOUT_MS'];
  const originalMongoUri = process.env['MONGODB_URI'];
  const globalForMongo = globalThis as MongoClientGlobalState;

  beforeEach(() => {
    vi.resetModules();
    delete process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'];
    delete process.env['MONGODB_CONNECT_TIMEOUT_MS'];
    process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/app';
    globalForMongo.__mongoClientByKey = new Map();
    globalForMongo.__mongoClientPromiseByKey = new Map();
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }

    if (originalServerSelectionTimeout === undefined) {
      delete process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'];
    } else {
      process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'] = originalServerSelectionTimeout;
    }

    if (originalConnectTimeout === undefined) {
      delete process.env['MONGODB_CONNECT_TIMEOUT_MS'];
    } else {
      process.env['MONGODB_CONNECT_TIMEOUT_MS'] = originalConnectTimeout;
    }

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }

    delete globalForMongo.__mongoClientByKey;
    delete globalForMongo.__mongoClientPromiseByKey;
  });

  it('uses stable fallback timeouts in development', async () => {
    process.env['NODE_ENV'] = 'development';

    const { __testOnly } = await import('./mongo-client');
    const options = __testOnly.getMongoClientOptions();

    expect(options.serverSelectionTimeoutMS).toBe(5000);
    expect(options.connectTimeoutMS).toBe(5000);
  });

  it('preserves explicit timeout overrides', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['MONGODB_SERVER_SELECTION_TIMEOUT_MS'] = '2500';
    process.env['MONGODB_CONNECT_TIMEOUT_MS'] = '3500';

    const { __testOnly } = await import('./mongo-client');
    const options = __testOnly.getMongoClientOptions();

    expect(options.serverSelectionTimeoutMS).toBe(2500);
    expect(options.connectTimeoutMS).toBe(3500);
  });

  it('enables directConnection only for single-node localhost uris', async () => {
    const { __testOnly } = await import('./mongo-client');

    expect(__testOnly.isSingleNodeLocalMongoUri('mongodb://127.0.0.1:27017/app')).toBe(true);
    expect(__testOnly.isSingleNodeLocalMongoUri('mongodb://localhost:27017/app')).toBe(true);
    expect(__testOnly.isSingleNodeLocalMongoUri('mongodb://localhost:27017/app?replicaSet=rs0')).toBe(
      false
    );
    expect(__testOnly.isSingleNodeLocalMongoUri('mongodb+srv://cluster.example/app')).toBe(false);
  });

  it('closes cached Mongo clients and clears cache stores during invalidation', async () => {
    const cachedClient: MongoClientCacheTestDouble = {
      close: vi.fn(async () => undefined),
    };
    const pendingClient: MongoClientCacheTestDouble = {
      close: vi.fn(async () => undefined),
    };
    globalForMongo.__mongoClientByKey?.set('local:cached', cachedClient);
    globalForMongo.__mongoClientPromiseByKey?.set('local:cached', Promise.resolve(cachedClient));
    globalForMongo.__mongoClientPromiseByKey?.set('cloud:pending', Promise.resolve(pendingClient));

    const { invalidateMongoClientCache } = await import('./mongo-client');

    await invalidateMongoClientCache();
    await Promise.resolve();

    expect(cachedClient.close).toHaveBeenCalledTimes(1);
    expect(pendingClient.close).toHaveBeenCalledTimes(1);
    expect(globalForMongo.__mongoClientByKey?.size).toBe(0);
    expect(globalForMongo.__mongoClientPromiseByKey?.size).toBe(0);
  });
});
