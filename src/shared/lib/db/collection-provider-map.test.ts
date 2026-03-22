import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const originalMongoUri = process.env['MONGODB_URI'];

const loadModule = async () => {
  vi.resetModules();
  return import('./collection-provider-map');
};

describe('collection-provider-map', () => {
  beforeEach(() => {
    delete process.env['MONGODB_URI'];
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('returns empty route and provider maps without mongo configuration', async () => {
    const {
      getCollectionProviderMap,
      getCollectionRouteMap,
      invalidateCollectionProviderMapCache,
    } = await loadModule();
    invalidateCollectionProviderMapCache();

    await expect(getCollectionRouteMap()).resolves.toEqual({});
    await expect(getCollectionProviderMap()).resolves.toEqual({});
  });

  it('allows explicit mongodb request overrides without consulting storage', async () => {
    const { resolveCollectionProviderForRequest } = await loadModule();
    await expect(resolveCollectionProviderForRequest('orders', 'mongodb')).resolves.toBe(
      'mongodb'
    );
  });
});
