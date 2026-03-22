import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAppDbProviderMock,
  getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceProviderMock,
  isPrimaryProviderConfiguredMock,
} = vi.hoisted(() => ({
  getAppDbProviderMock: vi.fn(),
  getDatabaseEnginePolicyMock: vi.fn(),
  getDatabaseEngineServiceProviderMock: vi.fn(),
  isPrimaryProviderConfiguredMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceProvider: getDatabaseEngineServiceProviderMock,
  isPrimaryProviderConfigured: isPrimaryProviderConfiguredMock,
}));

import { getCmsDataProvider } from './cms-provider';

describe('getCmsDataProvider', () => {
  beforeEach(() => {
    getAppDbProviderMock.mockReset();
    getDatabaseEnginePolicyMock.mockReset();
    getDatabaseEngineServiceProviderMock.mockReset();
    isPrimaryProviderConfiguredMock.mockReset();

    getDatabaseEnginePolicyMock.mockResolvedValue({
      strictProviderAvailability: false,
      requireExplicitServiceRouting: false,
    });
    getDatabaseEngineServiceProviderMock.mockResolvedValue(null);
  });

  it('uses explicit mongodb routing when available and falls back to app provider otherwise', async () => {
    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce('mongodb');
    isPrimaryProviderConfiguredMock.mockReturnValue(true);

    await expect(getCmsDataProvider()).resolves.toBe('mongodb');

    getAppDbProviderMock.mockResolvedValue('mongodb');
    await expect(getCmsDataProvider()).resolves.toBe('mongodb');
    expect(getAppDbProviderMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid cms routing configurations', async () => {
    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce('redis');
    await expect(getCmsDataProvider()).rejects.toThrow(/cannot target Redis/i);

    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce('mongodb');
    getDatabaseEnginePolicyMock.mockResolvedValueOnce({
      strictProviderAvailability: true,
      requireExplicitServiceRouting: false,
    });
    isPrimaryProviderConfiguredMock.mockReturnValue(false);
    await expect(getCmsDataProvider()).rejects.toThrow(/not configured/i);

    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce(null);
    getDatabaseEnginePolicyMock.mockResolvedValueOnce({
      strictProviderAvailability: false,
      requireExplicitServiceRouting: true,
    });
    await expect(getCmsDataProvider()).rejects.toThrow(/requires explicit routing/i);
  });
});
