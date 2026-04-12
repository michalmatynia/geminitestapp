import { type UseQueryResult } from '@tanstack/react-query';

import { getLanguages } from '@/features/internationalization/public';
import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductCategory, ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
import type { ListQuery, SaveMutation, DeleteMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createMultiQueryV2,
  createMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateProductMetadata,
  invalidateProductTitleTerms,
} from '@/shared/lib/query-invalidation';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

export { productMetadataKeys };

export type ProductMetadataQueryOptions = {
  enabled?: boolean;
  allowWithoutCatalog?: boolean;
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

export function useCategoriesForCatalogs(
  catalogIds: string[],
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategory> {
  const normalizedCatalogIds = Array.from(
    new Set(
      catalogIds
        .map((catalogId) => catalogId.trim())
        .filter((catalogId) => catalogId.length > 0)
    )
  ).sort();
  const queryKey = normalizeQueryKey([
    ...productMetadataKeys.all,
    'categories-batch',
    normalizedCatalogIds,
  ]);

  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategory[]> => {
      if (normalizedCatalogIds.length === 0) return [];

      const grouped = await api.get<Record<string, ProductCategory[]>>(
        `/api/v2/products/categories/batch?catalogIds=${normalizedCatalogIds.map(encodeURIComponent).join(',')}`
      );

      return normalizedCatalogIds.flatMap((catalogId) => {
        const categories = grouped[catalogId];
        return Array.isArray(categories) ? categories : [];
      });
    },
    enabled: normalizedCatalogIds.length > 0 && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCategoriesForCatalogs',
      operation: 'list',
      resource: 'products.metadata.categories.batch',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'categories', 'batch'],
      description: 'Loads products metadata categories for multiple catalogs.',
    },
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

export function useFilterTags(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags(catalogId ?? '__all__');
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (catalogId) {
        return await api.get<ProductTag[]>(
          `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
        );
      }
      return await api.get<ProductTag[]>('/api/v2/products/tags/all');
    },
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useFilterTags',
      operation: 'list',
      resource: catalogId ? 'products.metadata.tags' : 'products.metadata.tags.all',
      domain: 'products',
      queryKey,
      tags: catalogId
        ? ['products', 'metadata', 'tags', 'filters']
        : ['products', 'metadata', 'tags', 'all', 'filters'],
      description: 'Loads products filter tags for either a single catalog or all catalogs.',
    },
  });
}

export function useAllTags(options?: ProductMetadataQueryOptions): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags('__all__');
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> =>
      await api.get<ProductTag[]>('/api/v2/products/tags/all'),
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useAllTags',
      operation: 'list',
      resource: 'products.metadata.tags.all',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'tags', 'all'],
      description: 'Loads all products metadata tags across catalogs.',
    },
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

export function useCustomFields(
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCustomFieldDefinition> {
  const queryKey = productMetadataKeys.customFields();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCustomFieldDefinition[]> =>
      await api.get<ProductCustomFieldDefinition[]>('/api/v2/products/custom-fields', {
        cache: 'no-store',
      }),
    enabled: options?.enabled ?? true,
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCustomFields',
      operation: 'list',
      resource: 'products.metadata.custom-fields',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'custom-fields'],
      description: 'Loads products metadata custom fields.',
    },
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

export function useTitleTerms(
  catalogId?: string,
  type?: ProductTitleTermType | null,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTitleTerm> {
  const allowWithoutCatalog = options?.allowWithoutCatalog ?? false;
  const queryKey = productMetadataKeys.titleTerms(catalogId ?? null, type ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTitleTerm[]> => {
      if (!catalogId && !allowWithoutCatalog) return [];
      return await api.get<ProductTitleTerm[]>('/api/v2/products/title-terms', {
        params: {
          ...(catalogId ? { catalogId } : {}),
          ...(type ? { type } : {}),
        },
        cache: 'no-store',
      });
    },
    enabled: (allowWithoutCatalog || Boolean(catalogId)) && (options?.enabled ?? true),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useTitleTerms',
      operation: 'list',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'title-terms'],
      description: 'Loads products metadata title terms.',
    },
  });
}

export function useSaveTitleTermMutation(): SaveMutation<
  ProductTitleTerm,
  {
    id?: string;
    data: {
      catalogId: string;
      type: ProductTitleTermType;
      name_en: string;
      name_pl?: string | null;
    };
  }
> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'save'] as const;
  return createMutationV2({
    mutationFn: ({ id, data }) =>
      id
        ? api.put<ProductTitleTerm>(`/api/v2/products/title-terms/${id}`, data)
        : api.post<ProductTitleTerm>('/api/v2/products/title-terms', data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveTitleTermMutation',
      operation: 'action',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'title-terms', 'save'],
      description: 'Runs products metadata title terms.',
    },
    invalidate: async (queryClient) => {
      await Promise.all([
        invalidateProductTitleTerms(queryClient),
        invalidateProductMetadata(queryClient),
      ]);
    },
  });
}

export function useDeleteTitleTermMutation(): DeleteMutation<
  void,
  { id: string; catalogId?: string | null }
> {
  const mutationKey = [...productMetadataKeys.all, 'title-terms', 'delete'] as const;
  return createDeleteMutationV2({
    mutationFn: async ({ id }) => {
      await api.delete<void>(`/api/v2/products/title-terms/${id}`);
    },
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteTitleTermMutation',
      operation: 'delete',
      resource: 'products.metadata.title-terms',
      domain: 'products',
      mutationKey,
      tags: ['products', 'metadata', 'title-terms', 'delete'],
      description: 'Deletes products metadata title terms.',
    },
    invalidate: async (queryClient, _data, variables) => {
      await Promise.all([
        invalidateProductTitleTerms(queryClient, variables.catalogId ?? null),
        invalidateProductMetadata(queryClient),
      ]);
    },
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
