/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoMocks = vi.hoisted(() => ({
  close: vi.fn(),
  connect: vi.fn(),
  createdUris: [] as string[],
  dbNames: [] as string[],
  createdOptions: [] as Array<Record<string, unknown> | undefined>,
}));

vi.mock('mongodb', () => {
  class MongoClient {
    constructor(uri: string, options?: Record<string, unknown>) {
      mongoMocks.createdUris.push(uri);
      mongoMocks.createdOptions.push(options);
    }

    async connect(): Promise<this> {
      const result = await mongoMocks.connect();
      return result === undefined ? this : result as this;
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
    'PRODUCTS_MONGODB_ACTIVE_SOURCE',
    'PRODUCTS_MONGODB_ACTIVE_SOURCE_DEFAULT',
    'ECOM_MONGODB_URI',
    'ECOM_MONGODB_DB',
    'ECOM_MONGODB_LOCAL_URI',
    'ECOM_MONGODB_LOCAL_DB',
    'ECOM_MONGODB_CLOUD_URI',
    'ECOM_MONGODB_CLOUD_DB',
    'ECOM_MONGODB_ACTIVE_SOURCE',
    'ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT',
    'ECOM_MONGODB_SECURITY_OVERRIDE_ENABLED',
    'ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES',
    'ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES_IN_PRODUCTION',
    'ECOM_MONGODB_FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR',
    'ECOM_MONGODB_TLS_ALLOW_INVALID_HOSTNAMES',
    'MONGODB_SECURITY_OVERRIDE_ENABLED',
    'MONGODB_TLS_ALLOW_INVALID_CERTIFICATES',
    'MONGODB_TLS_ALLOW_INVALID_CERTIFICATES_IN_PRODUCTION',
    'MONGODB_TLS_ALLOW_INVALID_HOSTNAMES',
    'MONGODB_PRODUCTS_URI',
    'MONGODB_PRODUCTS_DB',
    'MONGODB_PRODUCTS_LOCAL_URI',
    'MONGODB_PRODUCTS_LOCAL_DB',
    'MONGODB_PRODUCTS_CLOUD_URI',
    'MONGODB_PRODUCTS_CLOUD_DB',
    'MONGODB_ECOM_URI',
    'MONGODB_ECOM_DB',
    'MONGODB_ECOM_LOCAL_URI',
    'MONGODB_ECOM_LOCAL_DB',
    'MONGODB_ECOM_CLOUD_URI',
    'MONGODB_ECOM_CLOUD_DB',
    'NODE_ENV',
    'VERCEL',
    'VERCEL_ENV',
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
    mongoMocks.createdOptions.length = 0;
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

  it('uses the products cloud database for ecommerce product reads on Vercel when local points at loopback', async () => {
    process.env['VERCEL'] = '1';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'local';
    process.env['ECOM_MONGODB_LOCAL_URI'] = 'mongodb://127.0.0.1:27021/ecom_local';
    process.env['ECOM_MONGODB_LOCAL_DB'] = 'ecom_local';
    process.env['PRODUCTS_MONGODB_CLOUD_URI'] = 'mongodb+srv://products.example.test/';
    process.env['PRODUCTS_MONGODB_CLOUD_DB'] = 'products_db';

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual(['mongodb+srv://products.example.test/']);
    expect(mongoMocks.dbNames).toEqual(['products_db']);
  });

  it('prefers the selected ecommerce cloud source over generic MongoDB URI variables', async () => {
    process.env['MONGODB_URI'] = 'mongodb+srv://generic.example.test/';
    process.env['MONGODB_DB'] = 'generic_db';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb+srv://ecommerce.example.test/';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_db';

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual(['mongodb+srv://ecommerce.example.test/']);
    expect(mongoMocks.dbNames).toEqual(['products_db']);
  });

  it('allows generic MongoDB URI variables as a last-resort ecommerce product read fallback', async () => {
    process.env['MONGODB_URI'] = 'mongodb+srv://generic.example.test/';
    process.env['MONGODB_DB'] = 'catalog_db';

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual(['mongodb+srv://generic.example.test/']);
    expect(mongoMocks.dbNames).toEqual(['catalog_db']);
  });

  it('falls back to insecure TLS when allowed for TLS handshake errors', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'development';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb+srv://products.example.test/';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_db';
    process.env['ECOM_MONGODB_SECURITY_OVERRIDE_ENABLED'] = 'true';
    process.env['ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES'] = 'true';
    mongoMocks.connect
      .mockRejectedValueOnce(new Error('C01835F301000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error'))
      .mockResolvedValue(undefined);

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual([
      'mongodb+srv://products.example.test/',
      'mongodb+srv://products.example.test/',
    ]);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(2);
    expect(mongoMocks.createdOptions[1]?.['tlsAllowInvalidCertificates']).toBe(true);
  });

  it('falls back to insecure TLS when URI-level tls=true is set and allowed', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'development';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb://127.0.0.1:27017/ecom_local?tls=true';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_db';
    process.env['ECOM_MONGODB_SECURITY_OVERRIDE_ENABLED'] = 'true';
    process.env['ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES'] = 'true';
    mongoMocks.connect
      .mockRejectedValueOnce(new Error('C01835F301000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error'))
      .mockResolvedValue(undefined);

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual([
      'mongodb://127.0.0.1:27017/ecom_local?tls=true',
      'mongodb://127.0.0.1:27017/ecom_local?tls=true',
    ]);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(2);
    expect(mongoMocks.createdOptions[1]?.['tlsAllowInvalidCertificates']).toBe(true);
  });

  it('does not fall back to insecure TLS when the security override flag is not set', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'development';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb+srv://products.example.test/';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_db';
    process.env['ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES'] = 'true';
    mongoMocks.connect.mockRejectedValue(new Error('C01835F301000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error'));

    const { getEcommerceProductsDb } = await import('./mongodb');

    await expect(getEcommerceProductsDb()).rejects.toThrow();
    expect(mongoMocks.createdUris).toEqual(['mongodb+srv://products.example.test/']);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
    expect(mongoMocks.createdOptions[0]?.['tlsAllowInvalidCertificates']).toBeUndefined();
  });

  it('does not fallback to insecure TLS in production without explicit production opt-in', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'production';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb+srv://products.example.test/';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_db';
    process.env['ECOM_MONGODB_TLS_ALLOW_INVALID_CERTIFICATES'] = 'true';
    mongoMocks.connect.mockRejectedValueOnce(new Error('C01835F301000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error'));

    const { getEcommerceProductsDb } = await import('./mongodb');

    await expect(getEcommerceProductsDb()).rejects.toThrow();
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
  });

  it('falls back to alternate ecommerce source on retryable timeout errors when enabled', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'development';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb://127.0.0.1:27017/ecom_cloud';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_cloud';
    process.env['ECOM_MONGODB_LOCAL_URI'] = 'mongodb://127.0.0.1:27021/ecom_local';
    process.env['ECOM_MONGODB_LOCAL_DB'] = 'ecom_local';
    process.env['ECOM_MONGODB_FALLBACK_TO_ALTERNATE_SOURCE_ON_CONN_ERROR'] = 'true';
    mongoMocks.connect
      .mockRejectedValueOnce(new Error('Socket timed out during startup'))
      .mockResolvedValue(undefined);

    const { getEcommerceProductsDb } = await import('./mongodb');

    await getEcommerceProductsDb();

    expect(mongoMocks.createdUris).toEqual([
      'mongodb://127.0.0.1:27017/ecom_cloud',
      'mongodb://127.0.0.1:27021/ecom_local',
    ]);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(2);
    expect(mongoMocks.dbNames).toEqual(['products_cloud', 'ecom_local']);
  });

  it('does not fallback to alternate ecommerce source when flag is disabled', async () => {
    process.env['VERCEL'] = '1';
    process.env['NODE_ENV'] = 'development';
    process.env['ECOM_MONGODB_ACTIVE_SOURCE_DEFAULT'] = 'cloud';
    process.env['ECOM_MONGODB_CLOUD_URI'] = 'mongodb://127.0.0.1:27017/ecom_cloud';
    process.env['ECOM_MONGODB_CLOUD_DB'] = 'products_cloud';
    process.env['ECOM_MONGODB_LOCAL_URI'] = 'mongodb://127.0.0.1:27021/ecom_local';
    process.env['ECOM_MONGODB_LOCAL_DB'] = 'ecom_local';
    mongoMocks.connect.mockRejectedValue(new Error('Socket timed out during startup'));

    const { getEcommerceProductsDb } = await import('./mongodb');

    await expect(getEcommerceProductsDb()).rejects.toThrow();
    expect(mongoMocks.createdUris).toEqual(['mongodb://127.0.0.1:27017/ecom_cloud']);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
  });

  it('does not fallback to insecure TLS for non-TLS MongoDB URIs', async () => {
    process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/ecom_local';
    process.env['MONGODB_DB'] = 'ecom_local';
    process.env['MONGODB_TLS_ALLOW_INVALID_CERTIFICATES'] = 'true';
    mongoMocks.connect.mockRejectedValueOnce(new Error('C01835F301000000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error'));

    const { getDb } = await import('./mongodb');

    await expect(getDb()).rejects.toThrow();
    expect(mongoMocks.createdUris).toEqual(['mongodb://127.0.0.1:27017/ecom_local']);
    expect(mongoMocks.connect).toHaveBeenCalledTimes(1);
    expect(mongoMocks.createdOptions[0]?.['tls']).not.toBe(true);
  });
});
