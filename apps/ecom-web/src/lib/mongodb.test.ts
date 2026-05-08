/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoMocks = vi.hoisted(() => ({
  close: vi.fn(),
  connect: vi.fn(),
  createdUris: [] as string[],
  dbNames: [] as string[],
}));

vi.mock('mongodb', () => {
  class MongoClient {
    constructor(uri: string) {
      mongoMocks.createdUris.push(uri);
    }

    async connect(): Promise<this> {
      mongoMocks.connect();
      return this;
    }

    db(name: string): { name: string } {
      mongoMocks.dbNames.push(name);
      return { name };
    }

    async close(): Promise<void> {
      mongoMocks.close();
    }
  }

  return { MongoClient };
});

const clearMongoEnv = (): void => {
  for (const key of [
    'MONGODB_URI',
    'MONGODB_DB',
    'MONGODB_LOCAL_URI',
    'MONGODB_LOCAL_DB',
    'MONGODB_CLOUD_URI',
    'MONGODB_CLOUD_DB',
    'MONGODB_ACTIVE_SOURCE',
    'MONGODB_ACTIVE_SOURCE_DEFAULT',
    'PRODUCTS_MONGODB_URI',
    'PRODUCTS_MONGODB_DB',
    'PRODUCTS_MONGODB_LOCAL_URI',
    'PRODUCTS_MONGODB_LOCAL_DB',
    'PRODUCTS_MONGODB_CLOUD_URI',
    'PRODUCTS_MONGODB_CLOUD_DB',
    'PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT',
    'ECOM_MONGODB_URI',
    'ECOM_MONGODB_DB',
    'ECOM_MONGODB_LOCAL_URI',
    'ECOM_MONGODB_LOCAL_DB',
    'ECOM_MONGODB_CLOUD_URI',
    'ECOM_MONGODB_CLOUD_DB',
    'ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT',
  ]) {
    delete process.env[key];
  }
};

describe('ecommerce MongoDB resolver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mongoMocks.createdUris.length = 0;
    mongoMocks.dbNames.length = 0;
    clearMongoEnv();
  });

  it('defaults ecommerce runtime data to the thin local ecommerce database', async () => {
    const { getDb } = await import('./mongodb');

    await getDb();

    expect(mongoMocks.createdUris).toEqual(['mongodb://127.0.0.1:27021/ecom_local']);
    expect(mongoMocks.dbNames).toEqual(['ecom_local']);
  });

  it('defaults ecommerce product data to the same thin local ecommerce database', async () => {
    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual(['mongodb://127.0.0.1:27021/ecom_local']);
    expect(mongoMocks.dbNames).toEqual(['ecom_local']);
  });
});
