/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useUpdateProductMutation } from '@/features/products/hooks/useProductData';

const mocks = vi.hoisted(() => ({
  useOfflineMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/shared/hooks/offline/useOfflineMutation', () => ({
  useOfflineMutation: mocks.useOfflineMutation,
}));

describe('useUpdateProductMutation', () => {
  it('uses list/detail/count invalidation scope instead of products.all', () => {
    renderHook(() => useUpdateProductMutation());

    expect(mocks.useOfflineMutation).toHaveBeenCalledTimes(1);
    const options = mocks.useOfflineMutation.mock.calls[0]?.[1] as {
      queryKey: readonly unknown[];
      extraInvalidateKeys: (variables: { id: string; data: unknown }) => readonly unknown[][];
    };

    expect(options.queryKey).toEqual(QUERY_KEYS.products.lists());
    const extraKeys = options.extraInvalidateKeys({ id: 'product-1', data: {} });
    expect(extraKeys).toEqual([QUERY_KEYS.products.counts(), QUERY_KEYS.products.detail('product-1')]);
  });
});

