import { type UseQueryResult } from '@tanstack/react-query';

import { getLanguages } from '@/features/internationalization/public';
import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductCategory, ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { ListQuery, SaveMutation, DeleteMutation } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createMultiQueryV2,
  createMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateProductMetadata } from '@/shared/lib/query-invalidation';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export { productMetadataKeys };

export type ProductMetadataQueryOptions = {
  enabled?: boolean;
};

const STABLE_METADATA_STALE_MS = 10 * 60 * 1_000;
const STABLE_METADATA_QUERY_OPTIONS = {
  staleTime: STABLE_METADATA_STALE_MS,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
};

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

export function useCatalogs(options?: ProductMetadataQueryOptions): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CatalogRecord[]> =>
      await api.get<CatalogRecord[]>('/api/v2/products/entities/catalogs'),
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'catalogs'],
      description: 'Loads products metadata catalogs.'},
  });
}

export function useCategories(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategory> {
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
    enabled: Boolean(catalogId) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useMetadataCategories',
      operation: 'list',
      resource: 'products.metadata.categories',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'categories'],
      description: 'Loads products metadata categories.'},
  });
}

export function useTags(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (!catalogId) return [];
      return await api.get<ProductTag[]>(
        `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useMetadataTags',
      operation: 'list',
      resource: 'products.metadata.tags',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'tags'],
      description: 'Loads products metadata tags.'},
  });
}

export function useShippingGroups(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductShippingGroup> {
  const queryKey = productMetadataKeys.shippingGroups(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductShippingGroup[]> => {
      if (!catalogId) return [];
      return await api.get<ProductShippingGroup[]>(
        `/api/v2/products/shipping-groups?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useShippingGroups',
      operation: 'list',
      resource: 'products.metadata.shipping-groups',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'shipping-groups'],
      description: 'Loads products metadata shipping groups.',
    },
  });
}

export function useMultiTags(
  catalogIds: string[],
  options?: ProductMetadataQueryOptions
): UseQueryResult<ProductTag[]>[] {
  return createMultiQueryV2({
    queries: catalogIds.map((catalogId) => {
      const queryKey = normalizeQueryKey(productMetadataKeys.tags(catalogId));
      return {
        queryKey,
        queryFn: async (): Promise<ProductTag[]> =>
          await api.get<ProductTag[]>(
            `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
          ),
        enabled: options?.enabled ?? true,
        ...STABLE_METADATA_QUERY_OPTIONS,
        meta: {
          source: 'products.hooks.useMultiTags',
          operation: 'list',
          resource: 'products.metadata.tags',
          description: 'Loads products metadata tags.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'tags', 'multi'],
        },
      };
    }),
  });
}

export function useProducers(options?: ProductMetadataQueryOptions): ListQuery<Producer> {
  const queryKey = productMetadataKeys.producers();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Producer[]> =>
      await api.get<Producer[]>('/api/v2/products/producers'),
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useProducers',
      operation: 'list',
      resource: 'products.metadata.producers',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'producers'],
      description: 'Loads products metadata producers.'},
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
      description: 'Runs products metadata producers.'},
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
      description: 'Deletes products metadata producers.'},
    invalidate: async (queryClient) => {
      await invalidateProductMetadata(queryClient);
    },
  });
}

export function useParameters(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductParameter> {
  const queryKey = productMetadataKeys.parameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>('/api/v2/products/parameters', {
        params: {
          catalogId,
        },
        cache: 'no-store',
      });
    },
    enabled: Boolean(catalogId) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useParameters',
      operation: 'list',
      resource: 'products.metadata.parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'parameters'],
      description: 'Loads products metadata parameters.'},
  });
}

export function useSimpleParameters(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductSimpleParameter> {
  const queryKey = productMetadataKeys.simpleParameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSimpleParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductSimpleParameter[]>(
        `/api/v2/products/simple-parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useSimpleParameters',
      operation: 'list',
      resource: 'products.metadata.simple-parameters',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'simple-parameters'],
      description: 'Loads products metadata simple parameters.'},
  });
}

export function useLanguages(): ListQuery<Language> {
  const queryKey = productMetadataKeys.languages();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Language[]> => getLanguages(),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useLanguages',
      operation: 'list',
      resource: 'products.metadata.languages',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'languages'],
      description: 'Loads products metadata languages.'},
  });
}

export function usePriceGroups(
  options?: ProductMetadataQueryOptions
): ListQuery<PriceGroupWithDetails> {
  const queryKey = productMetadataKeys.priceGroups();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/v2/products/metadata/price-groups'),
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.usePriceGroups',
      operation: 'list',
      resource: 'products.metadata.price-groups',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'price-groups'],
      description: 'Loads products metadata price groups.'},
  });
}
