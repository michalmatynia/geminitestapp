/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mongoClientConnect: vi.fn(),
  mongoClientCtor: vi.fn(),
  mongoClientDb: vi.fn(),
  resolveEcommerceMongoSourceConfig: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/utils/mongo', () => ({
  isTransientMongoConnectionError: (error: unknown) =>
    error instanceof Error &&
    `${error.name} ${error.message}`.toLowerCase().includes('econnrefused'),
  resolveEcommerceMongoSourceConfig: mocks.resolveEcommerceMongoSourceConfig,
}));

vi.mock('module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('module')>();
  class MockMongoClient {
    private readonly uri: string;

    constructor(uri: string, options: Record<string, unknown>) {
      this.uri = uri;
      mocks.mongoClientCtor(uri, options);
    }

    connect(): Promise<MockMongoClient> {
      return Promise.resolve(mocks.mongoClientConnect(this.uri)).then(() => this);
    }

    db(dbName: string): { namespace: string; target: string } {
      mocks.mongoClientDb(this.uri, dbName);
      return {
        namespace: dbName,
        target: `${this.uri}::${dbName}`,
      };
    }
  }

  return {
    ...actual,
    createRequire: vi.fn(() => (specifier: string) => {
      if (specifier === 'mongodb') {
        return { MongoClient: MockMongoClient };
      }
      throw new Error(`Unexpected require: ${specifier}`);
    }),
  };
});

const resetClientStore = (): void => {
  const globalWithStore = globalThis as typeof globalThis & {
    __ecommerceExportMongoClientByKey?: Map<string, unknown>;
  };
  globalWithStore.__ecommerceExportMongoClientByKey = new Map<string, unknown>();
};

describe('ecommerce-product-export.config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetClientStore();
    mocks.resolveEcommerceMongoSourceConfig.mockImplementation((source: 'local' | 'cloud') =>
      source === 'local'
        ? {
            source,
            configured: true,
            uri: 'mongodb://127.0.0.1:27021/ecom_local',
            dbName: 'ecom_local',
            usesLegacyEnv: false,
          }
        : {
            source,
            configured: true,
            uri: 'mongodb+srv://cluster.example/ecom_cloud',
            dbName: 'ecom_cloud',
            usesLegacyEnv: false,
          }
    );
  });

  it('resolves local and cloud ecommerce export DB targets for write operations', async () => {
    const module = await import('./ecommerce-product-export.config');

    const targets = await module.getAllEcommerceExportDbTargetsForWrite();

    expect(targets).toEqual([
      expect.objectContaining({
        key: 'local:mongodb://127.0.0.1:27021/ecom_local::ecom_local',
        db: expect.objectContaining({
          namespace: 'ecom_local',
          target: 'mongodb://127.0.0.1:27021/ecom_local::ecom_local',
        }),
      }),
      expect.objectContaining({
        key: 'cloud:mongodb+srv://cluster.example/ecom_cloud::ecom_cloud',
        db: expect.objectContaining({
          namespace: 'ecom_cloud',
          target: 'mongodb+srv://cluster.example/ecom_cloud::ecom_cloud',
        }),
      }),
    ]);
    expect(mocks.resolveEcommerceMongoSourceConfig).toHaveBeenCalledWith('local');
    expect(mocks.resolveEcommerceMongoSourceConfig).toHaveBeenCalledWith('cloud');
    expect(mocks.mongoClientCtor).toHaveBeenNthCalledWith(
      1,
      'mongodb://127.0.0.1:27021/ecom_local',
      {
        connectTimeoutMS: 3_000,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 3_000,
      }
    );
    expect(mocks.mongoClientCtor).toHaveBeenNthCalledWith(
      2,
      'mongodb+srv://cluster.example/ecom_cloud',
      {
        connectTimeoutMS: 5_000,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5_000,
      }
    );
  });

  it('dedupes local and cloud targets when both sources point to the same database', async () => {
    mocks.resolveEcommerceMongoSourceConfig.mockReturnValue({
      source: 'local',
      configured: true,
      uri: 'mongodb://127.0.0.1:27021/ecom_local',
      dbName: 'ecom_local',
      usesLegacyEnv: false,
    });
    const module = await import('./ecommerce-product-export.config');

    const targets = await module.getAllEcommerceExportDbTargetsForWrite();

    expect(targets).toHaveLength(1);
    expect(targets[0]?.key).toBe('local:mongodb://127.0.0.1:27021/ecom_local::ecom_local');
    expect(mocks.mongoClientCtor).toHaveBeenCalledTimes(1);
  });

  it('reports a clear local ecommerce database outage when the local target is unreachable', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:27021');
    error.name = 'MongoServerSelectionError';
    mocks.mongoClientConnect.mockRejectedValueOnce(error);
    const module = await import('./ecommerce-product-export.config');

    await expect(module.getAllEcommerceExportDbTargetsForWrite()).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
      expected: true,
      httpStatus: 503,
      message:
        'Local ecommerce database is not reachable. Start the local ecommerce MongoDB service and try again.',
      meta: {
        ecommerceMongoDbName: 'ecom_local',
        ecommerceMongoSource: 'local',
      },
      retryable: true,
    });
  });
});
