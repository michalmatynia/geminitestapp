import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products';
import type { ProductPatchInput } from '@/shared/contracts/products/io';
import type { UpdateMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { getProductDetailQueryKey } from './productCache';

type ProductQuickField = keyof ProductPatchInput;

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

type ProductFieldUpdateInput = {
  id: string;
  field: ProductQuickField;
  value: number;
};

type ProductFieldUpdateContext = {
  previousLists: Array<[readonly unknown[], ProductListCacheValue]>;
  previousDetail: ProductWithImages | undefined;
  previousDetailEdit: ProductWithImages | undefined;
};

const patchProductListCacheValue = (
  cacheValue: ProductListCacheValue,
  productId: string,
  field: ProductQuickField,
  value: number
): ProductListCacheValue => {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    };
  }
  return cacheValue;
};

const mergeUpdatedProductIntoListCacheValue = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === savedProduct.id ? { ...product, ...savedProduct } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  return cacheValue;
};

const syncUpdatedProductAcrossCaches = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages
): void => {
  queryClient.setQueriesData(
    { queryKey: QUERY_KEYS.products.lists() },
    (old: ProductListCacheValue) => mergeUpdatedProductIntoListCacheValue(old, savedProduct)
  );
  queryClient.setQueryData(getProductDetailQueryKey(savedProduct.id), savedProduct);
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), savedProduct);
};

const markUpdatedProductCachesStale = (
  queryClient: QueryClient,
  productId: string
): Promise<void> =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.lists(),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: getProductDetailQueryKey(productId),
      refetchType: 'none',
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.products.detailEdit(productId),
      refetchType: 'none',
    }),
  ]).then(() => undefined);

const prepareProductFieldOptimisticUpdate = async (
  queryClient: QueryClient,
  { id, field, value }: ProductFieldUpdateInput
): Promise<ProductFieldUpdateContext> => {
  const listKey = QUERY_KEYS.products.lists();
  const detailKey = getProductDetailQueryKey(id);
  const detailEditKey = QUERY_KEYS.products.detailEdit(id);

  await Promise.all([
    queryClient.cancelQueries({ queryKey: listKey }),
    queryClient.cancelQueries({ queryKey: detailKey }),
    queryClient.cancelQueries({ queryKey: detailEditKey }),
  ]);

  const previousLists = queryClient.getQueriesData<ProductListCacheValue>({ queryKey: listKey });
  const previousDetail = queryClient.getQueryData<ProductWithImages>(detailKey);
  const previousDetailEdit = queryClient.getQueryData<ProductWithImages>(detailEditKey);

  queryClient.setQueriesData({ queryKey: listKey }, (old: ProductListCacheValue) =>
    patchProductListCacheValue(old, id, field, value)
  );
  queryClient.setQueryData(detailKey, (old: ProductWithImages | undefined) =>
    old === undefined ? old : { ...old, [field]: value }
  );
  queryClient.setQueryData(detailEditKey, (old: ProductWithImages | undefined) =>
    old === undefined ? old : { ...old, [field]: value }
  );

  return { previousLists, previousDetail, previousDetailEdit };
};

const rollbackProductFieldOptimisticUpdate = (
  queryClient: QueryClient,
  productId: string,
  context: ProductFieldUpdateContext | undefined
): void => {
  context?.previousLists.forEach(([queryKey, value]) => {
    queryClient.setQueryData(queryKey, value);
  });
  if (context?.previousDetail !== undefined) {
    queryClient.setQueryData(getProductDetailQueryKey(productId), context.previousDetail);
  }
  if (context?.previousDetailEdit !== undefined) {
    queryClient.setQueryData(QUERY_KEYS.products.detailEdit(productId), context.previousDetailEdit);
  }
};

export function useUpdateProductField(): UpdateMutation<
  ProductWithImages,
  ProductFieldUpdateInput
> {
  const queryClient = useQueryClient();

  return useUpdateMutationV2<
    ProductWithImages,
    ProductFieldUpdateInput,
    ProductFieldUpdateContext
  >({
    mutationFn: ({ id, field, value }): Promise<ProductWithImages> =>
      api.patch<ProductWithImages>(`/api/v2/products/${id}`, { [field]: value }),
    onMutate: (input) => prepareProductFieldOptimisticUpdate(queryClient, input),
    onError: (_err, { id }, context) => {
      rollbackProductFieldOptimisticUpdate(queryClient, id, context);
    },
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useUpdateProductField',
      operation: 'update',
      resource: 'products.field',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'field-update'],
      description: 'Updates a single product field with optimistic cache sync.',
    },
    onSuccess: (savedProduct) => {
      syncUpdatedProductAcrossCaches(queryClient, savedProduct);
    },
    invalidate: (mutationQueryClient, _, variables) =>
      markUpdatedProductCachesStale(mutationQueryClient, variables.id),
  });
}
