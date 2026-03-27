import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAppDbProviderMock,
  getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceProviderMock,
  isPrimaryProviderConfiguredMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  getAppDbProviderMock: vi.fn(),
  getDatabaseEnginePolicyMock: vi.fn(),
  getDatabaseEngineServiceProviderMock: vi.fn(),
  isPrimaryProviderConfiguredMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceProvider: getDatabaseEngineServiceProviderMock,
  isPrimaryProviderConfigured: isPrimaryProviderConfiguredMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { getAuthDataProvider } from './auth-provider';

describe('auth provider env override', () => {
  const originalAuthDbProvider = process.env['AUTH_DB_PROVIDER'];
  const originalMongoUri = process.env['MONGODB_URI'];

  beforeEach(() => {
    vi.clearAllMocks();
    getAppDbProviderMock.mockResolvedValue('mongodb');
    getDatabaseEnginePolicyMock.mockResolvedValue({
      requireExplicitServiceRouting: false,
    });
    getDatabaseEngineServiceProviderMock.mockResolvedValue(null);
    isPrimaryProviderConfiguredMock.mockReturnValue(true);
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
  });

  afterEach(() => {
    if (originalAuthDbProvider === undefined) {
      delete process.env['AUTH_DB_PROVIDER'];
    } else {
      process.env['AUTH_DB_PROVIDER'] = originalAuthDbProvider;
    }

    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
    } else {
      process.env['MONGODB_URI'] = originalMongoUri;
    }
  });

  it('uses AUTH_DB_PROVIDER before settings and route-map fallbacks', async () => {
    process.env['AUTH_DB_PROVIDER'] = 'mongodb';

    await expect(getAuthDataProvider()).resolves.toBe('mongodb');

    expect(getAppDbProviderMock).not.toHaveBeenCalled();
    expect(getDatabaseEnginePolicyMock).not.toHaveBeenCalled();
    expect(getMongoDbMock).not.toHaveBeenCalled();
    expect(getDatabaseEngineServiceProviderMock).not.toHaveBeenCalled();
  });
});
