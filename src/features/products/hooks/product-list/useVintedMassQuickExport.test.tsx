// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api-client';

const {
  apiPostMock,
  clearPersistedVintedQuickListFeedbackMock,
  ensureVintedBrowserSessionMock,
  fetchIntegrationsWithConnectionsMock,
  fetchPreferredVintedConnectionMock,
  invalidateProductListingsAndBadgesMock,
  invalidateProductsMock,
  logClientCatchMock,
  persistVintedQuickListFeedbackMock,
  preflightVintedQuickListSessionMock,
  toastMock,
} = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  clearPersistedVintedQuickListFeedbackMock: vi.fn(),
  ensureVintedBrowserSessionMock: vi.fn(),
  fetchIntegrationsWithConnectionsMock: vi.fn(),
  fetchPreferredVintedConnectionMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
  invalidateProductsMock: vi.fn(),
  logClientCatchMock: vi.fn(),
  persistVintedQuickListFeedbackMock: vi.fn(),
  preflightVintedQuickListSessionMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
  clearPersistedVintedQuickListFeedback: (...args: unknown[]) =>
    clearPersistedVintedQuickListFeedbackMock(...args),
  ensureVintedBrowserSession: (...args: unknown[]) =>
    ensureVintedBrowserSessionMock(...args),
  fetchIntegrationsWithConnections: () => fetchIntegrationsWithConnectionsMock(),
  fetchPreferredVintedConnection: () => fetchPreferredVintedConnectionMock(),
  integrationSelectionQueryKeys: {
    withConnections: ['integrations', 'with-connections'],
    vintedDefaultConnection: ['integrations', 'vinted', 'default-connection'],
  },
  isVintedBrowserAuthRequiredMessage: (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return (
      normalized.includes('auth_required') ||
      normalized.includes('manual verification') ||
      normalized.includes('browser challenge') ||
      normalized.includes('could not be verified') ||
      normalized.includes('verification is incomplete') ||
      normalized.includes('session expired')
    );
  },
  isVintedIntegrationSlug: (value: string | null | undefined) =>
    (value ?? '').trim().toLowerCase() === 'vinted',
  persistVintedQuickListFeedback: (...args: unknown[]) =>
    persistVintedQuickListFeedbackMock(...args),
  preflightVintedQuickListSession: (...args: unknown[]) =>
    preflightVintedQuickListSessionMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-factories-v2')>();
  return {
    ...actual,
    fetchQueryV2: (_queryClient: unknown, config: { queryFn: () => Promise<unknown> }) =>
      config.queryFn,
  };
});

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      post: (...args: unknown[]) => apiPostMock(...args),
    },
  };
});

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args),
  invalidateProducts: (...args: unknown[]) => invalidateProductsMock(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => toastMock(...args),
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/utils/observability/client-error-logger')>();
  return {
    ...actual,
    logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  };
});

import { useVintedMassQuickExport } from './useVintedMassQuickExport';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

describe('useVintedMassQuickExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateProductListingsAndBadgesMock.mockResolvedValue(undefined);
    invalidateProductsMock.mockResolvedValue(undefined);
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { sessionReady: true },
      ready: true,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { sessionReady: true },
      savedSession: true,
    });
    fetchPreferredVintedConnectionMock.mockResolvedValue({
      connectionId: 'conn-vinted-2',
    });
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
  });

  it('queues selected products, persists queued feedback, and saves the preferred Vinted connection', async () => {
    apiPostMock.mockImplementation(async (url: string) => {
      if (url === '/api/v2/integrations/products/product-1/listings') {
        return { id: 'listing-1', queue: { jobId: 'job-1' } };
      }
      if (url === '/api/v2/integrations/products/product-2/listings') {
        return { id: 'listing-2', queue: { jobId: 'job-2' } };
      }
      if (url === '/api/v2/integrations/exports/vinted/default-connection') {
        return { connectionId: 'conn-vinted-2' };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useVintedMassQuickExport(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(['product-1', 'product-2']);
    });

    expect(preflightVintedQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-2',
    });
    expect(persistVintedQuickListFeedbackMock).toHaveBeenNthCalledWith(
      1,
      'product-1',
      'processing',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
      }
    );
    expect(persistVintedQuickListFeedbackMock).toHaveBeenNthCalledWith(
      2,
      'product-1',
      'queued',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
        listingId: 'listing-1',
        requestId: 'job-1',
      }
    );
    expect(persistVintedQuickListFeedbackMock).toHaveBeenNthCalledWith(
      3,
      'product-2',
      'processing',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
      }
    );
    expect(persistVintedQuickListFeedbackMock).toHaveBeenNthCalledWith(
      4,
      'product-2',
      'queued',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
        listingId: 'listing-2',
        requestId: 'job-2',
      }
    );
    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalledTimes(2);
    expect(invalidateProductsMock).toHaveBeenCalledWith(queryClient);
    expect(queryClient.getQueryData(['integrations', 'vinted', 'default-connection'])).toEqual({
      connectionId: 'conn-vinted-2',
    });
    expect(toastMock).toHaveBeenCalledWith('Vinted mass export done: 2/2 queued.', {
      variant: 'success',
    });
  });

  it('marks selected products as failed when Vinted session refresh cannot save a login session', async () => {
    preflightVintedQuickListSessionMock.mockResolvedValueOnce({
      response: { sessionReady: false },
      ready: false,
    });
    ensureVintedBrowserSessionMock.mockResolvedValueOnce({
      response: { sessionReady: false },
      savedSession: false,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useVintedMassQuickExport(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(['product-1', 'product-2']);
    });

    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-2',
    });
    expect(persistVintedQuickListFeedbackMock).toHaveBeenCalledWith(
      'product-1',
      'failed',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
      }
    );
    expect(persistVintedQuickListFeedbackMock).toHaveBeenCalledWith(
      'product-2',
      'failed',
      {
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-2',
      }
    );
    expect(
      apiPostMock.mock.calls.some(([url]) =>
        String(url).includes('/api/v2/integrations/products/')
      )
    ).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      'Vinted login session could not be saved. Complete login verification and retry.',
      { variant: 'error' }
    );
  });

  it('clears persisted feedback and reports already listed products separately from failures', async () => {
    apiPostMock.mockImplementation(async (url: string) => {
      if (url === '/api/v2/integrations/products/product-1/listings') {
        return { id: 'listing-1', queue: { jobId: 'job-1' } };
      }
      if (url === '/api/v2/integrations/products/product-2/listings') {
        throw new ApiError('Already exists on this account.', 409);
      }
      if (url === '/api/v2/integrations/exports/vinted/default-connection') {
        return { connectionId: 'conn-vinted-2' };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useVintedMassQuickExport(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.execute(['product-1', 'product-2']);
    });

    expect(clearPersistedVintedQuickListFeedbackMock).toHaveBeenCalledWith('product-2');
    expect(persistVintedQuickListFeedbackMock).not.toHaveBeenCalledWith(
      'product-2',
      'failed',
      expect.anything()
    );
    expect(toastMock).toHaveBeenCalledWith(
      'Vinted mass export done: 1/2 queued, 1 already listed.',
      { variant: 'info' }
    );
  });
});
