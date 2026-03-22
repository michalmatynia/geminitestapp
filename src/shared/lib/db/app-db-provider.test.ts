import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalAppDbProvider = process.env['APP_DB_PROVIDER'];
const originalMongoUri = process.env['MONGODB_URI'];

const loadModule = async () => {
  vi.resetModules();
  return import('./app-db-provider');
};

describe('app-db-provider', () => {
  beforeEach(() => {
    delete process.env['APP_DB_PROVIDER'];
    delete process.env['MONGODB_URI'];
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalAppDbProvider === undefined) {
      delete process.env['APP_DB_PROVIDER'];
    } else {
      process.env['APP_DB_PROVIDER'] = originalAppDbProvider;
    }

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('returns the env-backed provider setting without requiring mongo', async () => {
    const { getAppDbProviderSetting, invalidateAppDbProviderCache } = await loadModule();
    process.env['APP_DB_PROVIDER'] = 'mongodb';
    invalidateAppDbProviderCache();

    await expect(getAppDbProviderSetting()).resolves.toBe('mongodb');
  });
});
