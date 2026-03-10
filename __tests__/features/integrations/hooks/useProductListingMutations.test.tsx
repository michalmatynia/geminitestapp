import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateListingMutation,
  useDeleteFromBaseMutation,
  useGenericCreateListingMutation,
  useRelistTraderaMutation,
  useSyncBaseImagesMutation,
  useUpdateListingInventoryIdMutation,
} from '@/features/integrations/hooks/useProductListingMutations';
import { api } from '@/shared/lib/api-client';
import {
  invalidateListingsBadgesAndQueues,
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';

vi.mock('@/shared/lib/api-client', () => {
  class ApiError extends Error {}
  return {
    ApiError,
    api: {
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingsBadgesAndQueues: vi.fn(() => Promise.resolve()),
  invalidateProductListingsAndBadges: vi.fn(() => Promise.resolve()),
  invalidateProducts: vi.fn(() => Promise.resolve()),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useProductListingMutations DTO wiring', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useGenericCreateListingMutation posts the centralized create payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'listing-1',
      productId: 'prod-1',
      integrationId: 'int-1',
      connectionId: 'conn-1',
      externalListingId: null,
      inventoryId: null,
      status: 'queued',
      listedAt: null,
      expiresAt: null,
      nextRelistAt: null,
      lastRelistedAt: null,
      lastStatusCheckAt: null,
      marketplaceData: { source: 'manual-listing', marketplace: 'tradera' },
      failureReason: null,
      exportHistory: [],
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
      integration: { id: 'int-1', name: 'Tradera', slug: 'tradera' },
      connection: { id: 'conn-1', name: 'Primary' },
      queued: true,
      queue: {
        name: 'tradera-listings',
        jobId: 'job-1',
        enqueuedAt: '2026-03-10T00:00:00.000Z',
      },
    } as never);

    const { result } = renderHook(() => useGenericCreateListingMutation(), { wrapper });

    await result.current.mutateAsync({
      productId: 'prod-1',
      integrationId: 'int-1',
      connectionId: 'conn-1',
    });

    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/products/prod-1/listings', {
      integrationId: 'int-1',
      connectionId: 'conn-1',
    });
    await waitFor(() =>
      expect(invalidateProductListingsAndBadges).toHaveBeenCalledWith(queryClient, 'prod-1')
    );
  });

  it('useDeleteFromBaseMutation posts the centralized delete payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      status: 'deleted',
      message: 'Delete from Base.com finished.',
      runId: 'run-1',
    } as never);

    const { result } = renderHook(() => useDeleteFromBaseMutation('prod-1'), { wrapper });

    await result.current.mutateAsync({
      listingId: 'listing-1',
      inventoryId: 'inv-1',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/products/prod-1/listings/listing-1/delete-from-base',
      { inventoryId: 'inv-1' }
    );
    await waitFor(() =>
      expect(invalidateListingsBadgesAndQueues).toHaveBeenCalledWith(queryClient, 'prod-1')
    );
  });

  it('useUpdateListingInventoryIdMutation patches the centralized inventory payload', async () => {
    vi.mocked(api.patch).mockResolvedValue({ success: true } as never);

    const { result } = renderHook(() => useUpdateListingInventoryIdMutation('prod-1'), {
      wrapper,
    });

    await result.current.mutateAsync({
      listingId: 'listing-1',
      inventoryId: 'inv-9',
    });

    expect(api.patch).toHaveBeenCalledWith(
      '/api/v2/integrations/products/prod-1/listings/listing-1',
      { inventoryId: 'inv-9' }
    );
    await waitFor(() =>
      expect(invalidateProductListingsAndBadges).toHaveBeenCalledWith(queryClient, 'prod-1')
    );
  });

  it('useSyncBaseImagesMutation posts the centralized sync payload', async () => {
    vi.mocked(api.post).mockResolvedValue({
      status: 'synced',
      count: 4,
      added: 2,
    } as never);

    const { result } = renderHook(() => useSyncBaseImagesMutation('prod-1'), { wrapper });

    const response = await result.current.mutateAsync({
      listingId: 'listing-1',
      inventoryId: 'inv-1',
    });

    expect(response.count).toBe(4);
    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/products/prod-1/listings/listing-1/sync-base-images',
      { inventoryId: 'inv-1' }
    );
    await waitFor(() => expect(invalidateProducts).toHaveBeenCalledWith(queryClient));
  });

  it('useCreateListingMutation returns the centralized queue response', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'listing-1',
      productId: 'prod-1',
      integrationId: 'int-1',
      connectionId: 'conn-1',
      externalListingId: null,
      inventoryId: null,
      status: 'queued',
      listedAt: null,
      expiresAt: null,
      nextRelistAt: null,
      lastRelistedAt: null,
      lastStatusCheckAt: null,
      marketplaceData: { source: 'manual-listing', marketplace: 'tradera' },
      failureReason: null,
      exportHistory: [],
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
      integration: { id: 'int-1', name: 'Tradera', slug: 'tradera' },
      connection: { id: 'conn-1', name: 'Primary' },
      queued: true,
      queue: {
        name: 'tradera-listings',
        jobId: 'job-9',
        enqueuedAt: '2026-03-10T00:00:00.000Z',
      },
    } as never);

    const { result } = renderHook(() => useCreateListingMutation('prod-1'), { wrapper });

    const response = await result.current.mutateAsync({
      integrationId: 'int-1',
      connectionId: 'conn-1',
      durationHours: 72,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 180,
      templateId: 'tpl-1',
    });

    expect(response.queue?.jobId).toBe('job-9');
    expect(api.post).toHaveBeenCalledWith('/api/v2/integrations/products/prod-1/listings', {
      integrationId: 'int-1',
      connectionId: 'conn-1',
      durationHours: 72,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 180,
      templateId: 'tpl-1',
    });
  });

  it('useRelistTraderaMutation posts the centralized relist request', async () => {
    vi.mocked(api.post).mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-12',
        enqueuedAt: '2026-03-10T00:00:00.000Z',
      },
    } as never);

    const { result } = renderHook(() => useRelistTraderaMutation('prod-1'), { wrapper });

    const response = await result.current.mutateAsync({ listingId: 'listing-1' });

    expect(response.queue?.jobId).toBe('job-12');
    expect(api.post).toHaveBeenCalledWith(
      '/api/v2/integrations/products/prod-1/listings/listing-1/relist',
      {}
    );
    await waitFor(() =>
      expect(invalidateProductListingsAndBadges).toHaveBeenCalledWith(queryClient, 'prod-1')
    );
    await waitFor(() => expect(invalidateProducts).toHaveBeenCalledWith(queryClient));
  });
});
