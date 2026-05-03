import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';

import { EDIT_PRODUCT_DETAIL_STALE_TIME_MS } from '@/features/products/hooks/product-list-state-utils';
import { PRODUCT_DETAIL_TIMEOUT_MS } from './useProductEditHydration.fetch';

export const useEditingProductDetailQuery = (
  editingProduct: ProductWithImages | null
): SingleQuery<ProductWithImages> => {
  const editingProductId = editingProduct?.id ?? 'none';
  return createSingleQueryV2<ProductWithImages>({
    id: editingProduct?.id,
    queryKey: (id) =>
      id !== 'none'
        ? QUERY_KEYS.products.detailEdit(id)
        : [...QUERY_KEYS.products.details(), 'edit', 'inactive'],
    queryFn: () =>
      api.get<ProductWithImages>(`/api/v2/products/${editingProductId}`, {
        timeout: PRODUCT_DETAIL_TIMEOUT_MS,
      }),
    staleTime: EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.hooks.useProductEditHydration.editingProductDetail',
      operation: 'detail',
      resource: 'products.detailEdit',
      domain: 'products',
      tags: ['products', 'detail', 'edit', 'editing'],
      description: 'Loads products detail for the live editor.',
    },
  });
};
