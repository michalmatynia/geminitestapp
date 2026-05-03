// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  invalidateProductListingsAndBadgesMock,
  invalidateProductsAndDetailMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  invalidateProductListingsAndBadgesMock: vi.fn(),
  invalidateProductsAndDetailMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductListingsAndBadges: (...args: unknown[]) =>
    invalidateProductListingsAndBadgesMock(...args),
  invalidateProductsAndDetail: (...args: unknown[]) =>
    invalidateProductsAndDetailMock(...args),
}));

import { productKeys } from '@/shared/lib/query-key-exports';

import {
  useProductBaseSyncPreview,
  useRunProductBaseSyncMutation,
} from './useProductBaseSync';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

describe('useProductBaseSync hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateProductsAndDetailMock.mockResolvedValue(undefined);
    invalidateProductListingsAndBadgesMock.mockResolvedValue(undefined);
    apiGetMock.mockResolvedValue({
      status: 'ready',
      canSync: true,
      disabledReason: null,
      profile: null,
      linkedBaseProductId: 'base-1',
      resolvedTargetSource: 'product',
      fields: [],
    });
    apiPostMock.mockResolvedValue({
      preview: {
        status: 'ready',
        canSync: true,
        disabledReason: null,
        profile: null,
        linkedBaseProductId: 'base-1',
        resolvedTargetSource: 'product',
        fields: [],
      },
      result: {
        status: 'success',
        localChanges: ['stock'],
        baseChanges: [],
        message: null,
        errorMessage: null,
      },
    });
  });

  it('supports disabling the preview auto-load until the caller triggers a manual check', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useProductBaseSyncPreview('product-1', { enabled: false }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    expect(apiGetMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });

    expect(apiGetMock).toHaveBeenCalledWith('/api/v2/products/product-1/sync/base', {
      cache: 'no-store',
    });
  });

  it('invalidates product lists, listings, and the preview after a manual Base sync run', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRunProductBaseSyncMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ productId: 'product-1' });
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/v2/products/product-1/sync/base', {});
    expect(invalidateProductsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
    expect(invalidateProductListingsAndBadgesMock).toHaveBeenCalledWith(
      queryClient,
      'product-1'
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: productKeys.baseSyncPreview('product-1'),
    });
  });
});
