// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type {
  PersistedQuickExportFeedback,
  ProductListingWithDetails,
  QuickExportFeedbackOptions,
} from '@/shared/contracts/integrations/listings';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

import { productListingsQueryKey } from './useListingQueries';
import {
  useMarketplaceQuickExportFeedback,
  type MarketplaceQuickExportFeedbackActions,
} from './useMarketplaceQuickExportFeedback';

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

describe('useMarketplaceQuickExportFeedback', () => {
  it('promotes tracked feedback to completed when the marketplace-specific success resolver accepts the listing', async () => {
    let feedback: PersistedQuickExportFeedback = {
      productId: 'product-1',
      status: 'processing',
      expiresAt: Date.now() + 60_000,
      requestId: 'request-1',
    };
    const trackedListing = {
      id: 'listing-1',
      status: 'failed',
    } as ProductListingWithDetails;
    const completedOptions: QuickExportFeedbackOptions = {
      requestId: 'request-1',
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
    };
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      normalizeQueryKey(productListingsQueryKey('product-1')),
      [trackedListing]
    );

    const actions: MarketplaceQuickExportFeedbackActions = {
      readFeedback: vi.fn(() => feedback),
      persistFeedback: vi.fn((_productId, status, options) => {
        feedback = {
          ...feedback,
          ...options,
          status,
        };
      }),
      clearFeedback: vi.fn(),
      findTrackedListing: vi.fn(() => trackedListing),
      buildFeedbackOptions: vi.fn(() => completedOptions),
      isTrackedListingSuccess: vi.fn(() => true),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useMarketplaceQuickExportFeedback(
          'product-1',
          'active',
          true,
          actions,
          'Tradera'
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(actions.persistFeedback).toHaveBeenCalledWith(
        'product-1',
        'completed',
        completedOptions
      );
    });
    expect(actions.isTrackedListingSuccess).toHaveBeenCalledWith(trackedListing, {
      productId: 'product-1',
      status: 'processing',
      expiresAt: expect.any(Number),
      requestId: 'request-1',
    });
  });

  it('keeps completed local feedback when a quick-export button sees a stale server recovery status', async () => {
    let feedback: PersistedQuickExportFeedback | null = {
      productId: 'product-1',
      status: 'completed',
      expiresAt: Date.now() + 60_000,
      requestId: 'request-1',
    };

    const actions: MarketplaceQuickExportFeedbackActions = {
      readFeedback: vi.fn(() => feedback),
      persistFeedback: vi.fn(),
      clearFeedback: vi.fn(() => {
        feedback = null;
      }),
      findTrackedListing: vi.fn(() => null),
      buildFeedbackOptions: vi.fn(() => ({})),
    };

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useMarketplaceQuickExportFeedback(
          'product-1',
          'auth_required',
          false,
          actions,
          'Tradera'
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.localFeedbackStatus).toBe('completed');
    });
    expect(actions.clearFeedback).not.toHaveBeenCalled();
  });
});
