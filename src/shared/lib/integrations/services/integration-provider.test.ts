import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAppDbProviderMock = vi.hoisted(() => vi.fn());
const getDatabaseEnginePolicyMock = vi.hoisted(() => vi.fn());
const getDatabaseEngineServiceProviderMock = vi.hoisted(() => vi.fn());
const isPrimaryProviderConfiguredMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));
vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
  getDatabaseEngineServiceProvider: getDatabaseEngineServiceProviderMock,
  isPrimaryProviderConfigured: isPrimaryProviderConfiguredMock,
}));

import { getIntegrationDataProvider } from '@/shared/lib/integrations/services/integration-provider';

describe('integration-provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAppDbProviderMock.mockResolvedValue('mongodb');
    getDatabaseEnginePolicyMock.mockResolvedValue({
      strictProviderAvailability: false,
      requireExplicitServiceRouting: false,
    });
    getDatabaseEngineServiceProviderMock.mockResolvedValue(null);
    isPrimaryProviderConfiguredMock.mockReturnValue(true);
  });

  it('returns the explicitly configured mongodb route provider', async () => {
    getDatabaseEngineServiceProviderMock.mockResolvedValue('mongodb');

    await expect(getIntegrationDataProvider()).resolves.toBe('mongodb');

    expect(getAppDbProviderMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported route providers', async () => {
    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce('redis');

    await expect(getIntegrationDataProvider()).rejects.toThrow(
      'Database Engine route "integrations" cannot target Redis. Configure MongoDB.'
    );

    getDatabaseEngineServiceProviderMock.mockResolvedValueOnce('postgresql');

    await expect(getIntegrationDataProvider()).rejects.toThrow(
      'Database Engine route "integrations" points to "postgresql" but only MongoDB is supported.'
    );
  });

  it('rejects mongodb routing when strict provider availability is enabled and mongodb is not configured', async () => {
    getDatabaseEnginePolicyMock.mockResolvedValue({
      strictProviderAvailability: true,
      requireExplicitServiceRouting: false,
    });
    getDatabaseEngineServiceProviderMock.mockResolvedValue('mongodb');
    isPrimaryProviderConfiguredMock.mockReturnValue(false);

    await expect(getIntegrationDataProvider()).rejects.toThrow(
      'Database Engine route "integrations" points to "mongodb" but it is not configured.'
    );
  });

  it('requires explicit routing when policy says so', async () => {
    getDatabaseEnginePolicyMock.mockResolvedValue({
      strictProviderAvailability: false,
      requireExplicitServiceRouting: true,
    });

    await expect(getIntegrationDataProvider()).rejects.toThrow(
      'Database Engine requires explicit routing for "integrations". Configure it in Workflow Database -> Database Engine.'
    );
  });

  it('falls back to the app provider when no explicit routing is configured', async () => {
    await expect(getIntegrationDataProvider()).resolves.toBe('mongodb');

    expect(getAppDbProviderMock).toHaveBeenCalledTimes(1);
  });
});
