// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationKeys } from '@/shared/lib/query-key-exports';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { fetchProductListings, useProductListings } from './useListingQueries';

describe('useListingQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    apiGetMock.mockResolvedValue([]);
  });

  it('configures product listings to refetch on every mount', async () => {
    const { result } = renderHook(() => useProductListings('product-1'));
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual(integrationKeys.listings('product-1'));
    expect(config.enabled).toBe(true);
    expect(config.staleTime).toBe(30_000);
    expect(config.refetchOnMount).toBe('always');

    await expect(config.queryFn()).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings',
      { cache: 'no-store' }
    );
  });

  it('fetches product listings from the integrations listings endpoint', async () => {
    apiGetMock.mockResolvedValue([{ id: 'listing-1' }]);

    await expect(fetchProductListings('product-2')).resolves.toEqual([{ id: 'listing-1' }]);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-2/listings',
      { cache: 'no-store' }
    );
  });
});
