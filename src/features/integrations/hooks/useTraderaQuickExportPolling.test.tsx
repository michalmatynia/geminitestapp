// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useTraderaQuickExportPolling } from './useTraderaQuickExportPolling';

const { fetchQueryV2Mock, invalidateProductListingsAndBadgesMock, invalidateProductsMock } =
  vi.hoisted(() => ({
    fetchQueryV2Mock: vi.fn(),
    invalidateProductListingsAndBadgesMock: vi.fn(),
    invalidateProductsMock: vi.fn(),
  }));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  fetchQueryV2: fetchQueryV2Mock,
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: invalidateProductListingsAndBadgesMock,
  invalidateProducts: invalidateProductsMock,
}));

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

describe('useTraderaQuickExportPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes duplicate-linked Tradera listings to completed even when the persisted row status is stale failed', async () => {
    const queryClient = createQueryClient();
    const setFeedbackStatus = vi.fn();
    const trackedListing = {
      id: 'listing-1',
      status: 'failed',
      listedAt: '2026-04-13T18:00:00.000Z',
      externalListingId: '725447805',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      marketplaceData: {
        listingUrl: 'https://www.tradera.com/item/725447805',
        tradera: {
          lastExecution: {
            requestId: 'job-tradera-1',
            metadata: {
              latestStage: 'duplicate_linked',
              duplicateMatchStrategy: 'exact-title-single-candidate',
            },
          },
        },
      },
    };

    fetchQueryV2Mock.mockReturnValue(() => Promise.resolve([trackedListing]));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useTraderaQuickExportPolling(
          'product-1',
          {
            productId: 'product-1',
            status: 'processing',
            expiresAt: Date.now() + 60_000,
            requestId: 'job-tradera-1',
          },
          setFeedbackStatus
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(setFeedbackStatus).toHaveBeenCalledWith(
        'completed',
        expect.objectContaining({
          listingId: 'listing-1',
          requestId: 'job-tradera-1',
          duplicateLinked: true,
          duplicateMatchStrategy: 'exact-title-single-candidate',
        })
      );
    });

    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalledWith(queryClient, 'product-1');
    expect(invalidateProductsMock).toHaveBeenCalledWith(queryClient);
  });
});
