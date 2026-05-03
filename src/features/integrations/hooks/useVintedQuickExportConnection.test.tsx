// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchIntegrationsWithConnectionsMock,
  fetchPreferredVintedConnectionMock,
  logClientCatchMock,
} = vi.hoisted(() => ({
  fetchIntegrationsWithConnectionsMock: vi.fn(),
  fetchPreferredVintedConnectionMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/features/integrations/components/listings/hooks/useIntegrationSelection', () => ({
  fetchIntegrationsWithConnections: () => fetchIntegrationsWithConnectionsMock(),
  fetchPreferredVintedConnection: () => fetchPreferredVintedConnectionMock(),
  integrationSelectionQueryKeys: {
    withConnections: ['integrations', 'with-connections'],
    vintedDefaultConnection: ['integrations', 'vinted', 'default-connection'],
  },
}));

vi.mock('@/shared/lib/query-factories-v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-factories-v2')>();
  return {
    ...actual,
    fetchQueryV2: (_queryClient: unknown, config: { queryFn: () => Promise<unknown> }) => config.queryFn,
  };
});

vi.mock('@/shared/utils/observability/client-error-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/utils/observability/client-error-logger')>();
  return {
    ...actual,
    logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  };
});

import { useVintedQuickExportConnection } from './useVintedQuickExportConnection';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useVintedQuickExportConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the saved Vinted default connection when it exists', async () => {
    fetchPreferredVintedConnectionMock.mockResolvedValue({ connectionId: 'conn-vinted-2' });
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
        connections: [
          { id: 'conn-vinted-1', name: 'Alpha', integrationId: 'integration-vinted-1' },
          { id: 'conn-vinted-2', name: 'Zulu', integrationId: 'integration-vinted-1' },
        ],
      },
    ]);

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVintedQuickExportConnection('product-1'), {
      wrapper,
    });

    await expect(result.current.resolveConnection()).resolves.toMatchObject({
      preferredConnectionId: 'conn-vinted-2',
      vintedConnection: {
        integrationId: 'integration-vinted-1',
        connection: expect.objectContaining({ id: 'conn-vinted-2' }),
      },
    });
  });

  it('falls back to alphabetical Vinted connection order when resolving the preference fails', async () => {
    fetchPreferredVintedConnectionMock.mockRejectedValue(new Error('Preference unavailable'));
    fetchIntegrationsWithConnectionsMock.mockResolvedValue([
      {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
        connections: [
          { id: 'conn-vinted-2', name: 'Zulu', integrationId: 'integration-vinted-1' },
          { id: 'conn-vinted-1', name: 'Alpha', integrationId: 'integration-vinted-1' },
        ],
      },
    ]);

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useVintedQuickExportConnection('product-1'), {
      wrapper,
    });

    await expect(result.current.resolveConnection()).resolves.toMatchObject({
      preferredConnectionId: null,
      vintedConnection: {
        integrationId: 'integration-vinted-1',
        connection: expect.objectContaining({ id: 'conn-vinted-1' }),
      },
    });
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'VintedQuickListButton',
        action: 'resolvePreferredConnection',
        productId: 'product-1',
        level: 'warn',
      })
    );
  });
});
