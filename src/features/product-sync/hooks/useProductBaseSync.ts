

import type {
  MutationResult,
  SingleQuery,
} from '@/shared/contracts/ui/queries';
import type {
  ProductSyncBulkRequest,
  ProductSyncBulkResponse,
  ProductSyncPreview,
  ProductSyncSingleProductResponse,
} from '@/shared/contracts/product-sync';
import { api } from '@/shared/lib/api-client';
import {
  createMutationV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import {
  productKeys,
  productSettingsKeys,
} from '@/shared/lib/query-key-exports';
import {
  invalidateProductsAndDetail,
  invalidateProductListingsAndBadges,
} from '@/shared/lib/query-invalidation';

type UseProductBaseSyncPreviewOptions = {
  enabled?: boolean;
};

export function useProductBaseSyncPreview(
  productId: string,
  options?: UseProductBaseSyncPreviewOptions
): SingleQuery<ProductSyncPreview> {
  const queryKey = productKeys.baseSyncPreview(productId);
  const enabled = options?.enabled ?? true;

  return createSingleQueryV2({
    id: productId,
    queryKey,
    queryFn: async (): Promise<ProductSyncPreview> =>
      api.get<ProductSyncPreview>(`/api/v2/products/${encodeURIComponent(productId)}/sync/base`, {
        cache: 'no-store',
      }),
    enabled: Boolean(productId) && enabled,
    staleTime: 15_000,
    refetchOnMount: 'always',
    meta: {
      source: 'product-sync.hooks.useProductBaseSyncPreview',
      operation: 'detail',
      resource: 'products.base-sync-preview',
      domain: 'products',
      queryKey,
      tags: ['products', 'base-sync', 'preview'],
      description: 'Loads the manual Base.com sync preview for one product.',
    },
  });
}

export function useRunProductBaseSyncMutation(): MutationResult<
  ProductSyncSingleProductResponse,
  { productId: string }
> {
  return createMutationV2({
    mutationKey: productSettingsKeys.syncProfiles(),
    mutationFn: async ({
      productId,
    }: {
      productId: string;
    }): Promise<ProductSyncSingleProductResponse> =>
      api.post<ProductSyncSingleProductResponse>(
        `/api/v2/products/${encodeURIComponent(productId)}/sync/base`,
        {}
      ),
    invalidate: async (queryClient, _data, variables): Promise<void> => {
      await Promise.all([
        invalidateProductsAndDetail(queryClient, variables.productId),
        invalidateProductListingsAndBadges(queryClient, variables.productId),
        queryClient.invalidateQueries({
          queryKey: productKeys.baseSyncPreview(variables.productId),
        }),
      ]);
    },
    meta: {
      source: 'product-sync.hooks.useRunProductBaseSyncMutation',
      operation: 'action',
      resource: 'products.base-sync-run',
      domain: 'products',
      mutationKey: productSettingsKeys.syncProfiles(),
      tags: ['products', 'base-sync', 'run'],
      description: 'Runs the manual Base.com sync for one product.',
    },
  });
}

export function useBulkProductBaseSyncMutation(): MutationResult<
  ProductSyncBulkResponse,
  ProductSyncBulkRequest
> {
  return createMutationV2({
    mutationKey: productSettingsKeys.syncProfiles(),
    mutationFn: async (input: ProductSyncBulkRequest): Promise<ProductSyncBulkResponse> =>
      api.post<ProductSyncBulkResponse>('/api/v2/products/sync/bulk', input),
    invalidate: async (queryClient, _data, variables): Promise<void> => {
      await Promise.all([
        ...variables.productIds.map((productId: string) =>
          Promise.all([
            invalidateProductsAndDetail(queryClient, productId),
            invalidateProductListingsAndBadges(queryClient, productId),
            queryClient.invalidateQueries({
              queryKey: productKeys.baseSyncPreview(productId),
            }),
          ])
        ),
      ]);
    },
    meta: {
      source: 'product-sync.hooks.useBulkProductBaseSyncMutation',
      operation: 'action',
      resource: 'products.base-sync-bulk',
      domain: 'products',
      mutationKey: productSettingsKeys.syncProfiles(),
      tags: ['products', 'base-sync', 'bulk'],
      description: 'Runs manual Base.com sync for a batch of products.',
    },
  });
}
