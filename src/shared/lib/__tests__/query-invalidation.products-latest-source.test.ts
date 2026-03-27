import { describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  invalidateProductsAndCounts,
  invalidateProductsAndDetail,
  refetchProductsAndCounts,
} from '@/shared/lib/query-invalidation';

const createQueryClientMock = () => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  refetchQueries: vi.fn().mockResolvedValue(undefined),
});

describe('product query invalidation latest-source coverage', () => {
  it('invalidates the validator latest-product source when products are created', async () => {
    const queryClient = createQueryClientMock();

    await invalidateProductsAndCounts(queryClient as never);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.counts(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
    });
  });

  it('invalidates the validator latest-product source when products are updated', async () => {
    const queryClient = createQueryClientMock();

    await invalidateProductsAndDetail(queryClient as never, 'product-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.detail('product-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.detailEdit('product-1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
    });
  });

  it('refetches the validator latest-product source alongside product lists and counts', async () => {
    const queryClient = createQueryClientMock();

    await refetchProductsAndCounts(queryClient as never);

    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
    });
    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.counts(),
    });
    expect(queryClient.refetchQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
    });
  });
});
