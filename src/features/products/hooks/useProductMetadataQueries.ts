'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getLanguages } from '@/features/internationalization/api';
import type { Language } from '@/shared/contracts/internationalization';
import type {
  CatalogRecord,
  PriceGroupWithDetails,
  Producer,
  ProductCategory,
  ProductCategoryWithChildren,
  ProductParameter,
  ProductSimpleParameter,
  ProductTag,
} from '@/shared/contracts/products';
import type { ListQuery, SaveMutation, DeleteMutation } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createMultiQueryV2,
  createMutationV2,
  createDeleteMutationV2,
  prefetchQueryV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateProductMetadata } from '@/shared/lib/query-invalidation';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export { productMetadataKeys };

const flattenCategoryTree = (
  nodes: ProductCategoryWithChildren[],
  parentId: string | null = null
): ProductCategory[] => {
  const flattened: ProductCategory[] = [];
  for (const node of nodes) {
    const { children, ...nodeWithoutChildren } = node;
    const normalizedNode: ProductCategory = {
      ...nodeWithoutChildren,
      parentId: node.parentId ?? parentId ?? null,
    };
    flattened.push(normalizedNode);
    if (Array.isArray(children) && children.length > 0) {
      flattened.push(...flattenCategoryTree(children, node.id));
    }
  }
  return flattened;
};

export function useCatalogs(): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CatalogRecord[]> => await api.get<CatalogRecord[]>('/api/catalogs'),
    meta: {
      source: 'products.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'catalogs'],
    },
  });
}

export function useCategories(catalogId?: string): ListQuery<ProductCategory> {
  const queryKey = productMetadataKeys.categories(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategory[]> => {
      if (!catalogId) return [];
      const tree = await api.get<ProductCategoryWithChildren[]>(
        `/api/v2/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}`
      );
      return flattenCategoryTree(tree);
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useMetadataCategories',
      operation: 'list',
      resource: 'products.metadata.categories',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'categories'],
    },
  });
}

export function useMultiCategories(catalogIds: string[]): UseQueryResult<ProductCategory[]>[] {
  return createMultiQueryV2({
    queries: catalogIds.map((catalogId) => {
      const queryKey = normalizeQueryKey(productMetadataKeys.categories(catalogId));
      return {
        queryKey,
        queryFn: async (): Promise<ProductCategory[]> =>
          await api.get<ProductCategory[]>(
            `/api/v2/products/categories?catalogId=${encodeURIComponent(catalogId)}`
          ),
        meta: {
          source: 'products.hooks.useMultiCategories',
          operation: 'list',
          resource: 'products.metadata.categories',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'categories', 'multi'],
        },
      };
    }),
  });
}

export function useTags(catalogId?: string): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (!catalogId) return [];
      return await api.get<ProductTag[]>(
        `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useMetadataTags',
      operation: 'list',
      resource: 'products.metadata.tags',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'tags'],
    },
  });
}

export function useMultiTags(catalogIds: string[]): UseQueryResult<ProductTag[]>[] {
  return createMultiQueryV2({
    queries: catalogIds.map((catalogId) => {
      const queryKey = normalizeQueryKey(productMetadataKeys.tags(catalogId));
      return {
        queryKey,
        queryFn: async (): Promise<ProductTag[]> =>
          await api.get<ProductTag[]>(
            `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
          ),
        meta: {
          source: 'products.hooks.useMultiTags',
          operation: 'list',
          resource: 'products.metadata.tags',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'tags', 'multi'],
        },
      };
    }),
  });
}

export function useProducers(): ListQuery<Producer> {
  const queryKey = productMetadataKeys.producers();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Producer[]> => await api.get<Producer[]>('/api/v2/products/producers'),
    meta: {
      source: 'products.hooks.useProducers',
      operation: 'list',
      resource: 'products.metadata.producers',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'producers'],
    },
  });
}

export function useSaveProducerMutation(): SaveMutation<
  Producer,
  { id: string | undefined; data: { name: string; website: string | null } }
  > {
  const mutationKey = productMetadataKeys.producers();
  return createMutationV2({
    mutationFn: ({ id, data }) =>
      id
        ? api.put<Producer>(`/api/v2/products/producers/${id}`, data)
        : api.post<Producer>('/api/v2/products/producers', data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveProducerMutation',
      operation: 'action',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'save'],
    },
    invalidate: async (queryClient) => {
      await invalidateProductMetadata(queryClient);
    },
  });
}

export function useDeleteProducerMutation(): DeleteMutation {
  const mutationKey = productMetadataKeys.producers();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.delete<void>(`/api/v2/products/producers/${id}`),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteProducerMutation',
      operation: 'delete',
      resource: 'products.metadata.producers',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'producers', 'delete'],
    },
    invalidate: async (queryClient) => {
      await invalidateProductMetadata(queryClient);
    },
  });
}

export function useParameters(catalogId?: string): ListQuery<ProductParameter> {
  const queryKey = productMetadataKeys.parameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>('/api/v2/products/parameters', {
        params: {
          catalogId,
          fresh: 1,
        },
        cache: 'no-store',
      });
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useParameters',
      operation: 'list',
      resource: 'products.metadata.parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'parameters'],
    },
  });
}

export function useSimpleParameters(catalogId?: string): ListQuery<ProductSimpleParameter> {
  const queryKey = productMetadataKeys.simpleParameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSimpleParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductSimpleParameter[]>(
        `/api/v2/products/simple-parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'products.hooks.useSimpleParameters',
      operation: 'list',
      resource: 'products.metadata.simple-parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'simple-parameters'],
    },
  });
}

export function useMultiParameters(catalogIds: string[]): UseQueryResult<ProductParameter[]>[] {
  return createMultiQueryV2({
    queries: catalogIds.map((catalogId) => {
      const queryKey = normalizeQueryKey(productMetadataKeys.parameters(catalogId));
      return {
        queryKey,
        queryFn: async (): Promise<ProductParameter[]> =>
          await api.get<ProductParameter[]>('/api/v2/products/parameters', {
            params: {
              catalogId,
              fresh: 1,
            },
            cache: 'no-store',
          }),
        meta: {
          source: 'products.hooks.useMultiParameters',
          operation: 'list',
          resource: 'products.metadata.parameters',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'parameters', 'multi'],
        },
      };
    }),
  });
}

export function useLanguages(): ListQuery<Language> {
  const queryKey = productMetadataKeys.languages();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Language[]> => getLanguages(),
    meta: {
      source: 'products.hooks.useLanguages',
      operation: 'list',
      resource: 'products.metadata.languages',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'languages'],
    },
  });
}

export function usePriceGroups(): ListQuery<PriceGroupWithDetails> {
  const queryKey = productMetadataKeys.priceGroups();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/v2/products/metadata/price-groups'),
    meta: {
      source: 'products.hooks.usePriceGroups',
      operation: 'list',
      resource: 'products.metadata.price-groups',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'price-groups'],
    },
  });
}

export function useProductMetadataPrefetch(catalogId?: string): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (!catalogId) return;

    void prefetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(productMetadataKeys.categories(catalogId)),
      queryFn: async () => {
        const tree = await api.get<ProductCategoryWithChildren[]>(
          `/api/v2/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}`
        );
        return flattenCategoryTree(tree);
      },
      meta: {
        source: 'products.hooks.useProductMetadataPrefetch.categories',
        operation: 'list',
        resource: 'products.metadata.categories',
        domain: 'products',
        queryKey: normalizeQueryKey(productMetadataKeys.categories(catalogId)),
        tags: ['products', 'metadata', 'categories', 'prefetch'],
      },
    })();

    void prefetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(productMetadataKeys.tags(catalogId)),
      queryFn: () =>
        api.get<ProductTag[]>(`/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`),
      meta: {
        source: 'products.hooks.useProductMetadataPrefetch.tags',
        operation: 'list',
        resource: 'products.metadata.tags',
        domain: 'products',
        queryKey: normalizeQueryKey(productMetadataKeys.tags(catalogId)),
        tags: ['products', 'metadata', 'tags', 'prefetch'],
      },
    })();

    void prefetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(productMetadataKeys.parameters(catalogId)),
      queryFn: () =>
        api.get<ProductParameter[]>('/api/v2/products/parameters', {
          params: { catalogId, fresh: 1 },
          cache: 'no-store',
        }),
      meta: {
        source: 'products.hooks.useProductMetadataPrefetch.parameters',
        operation: 'list',
        resource: 'products.metadata.parameters',
        domain: 'products',
        queryKey: normalizeQueryKey(productMetadataKeys.parameters(catalogId)),
        tags: ['products', 'metadata', 'parameters', 'prefetch'],
      },
    })();
  }, [catalogId, queryClient]);
}
