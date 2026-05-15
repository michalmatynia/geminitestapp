import { type UseQueryResult } from '@tanstack/react-query';

import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type {
  ProductCategory,
  ProductCategoryWithChildren,
} from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useListQueryV2, useMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

import {
  flattenCategoryTree,
  normalizeOptionalIdentifier,
  productMetadataKeys,
  resolveMetadataQueryEnabled,
  STABLE_METADATA_QUERY_OPTIONS,
  type ProductMetadataQueryOptions,
} from './useProductMetadataQueries.shared';

const normalizeCatalogIds = (catalogIds: string[]): string[] =>
  Array.from(
    new Set(
      catalogIds
        .map((catalogId: string): string => catalogId.trim())
        .filter((catalogId: string): boolean => catalogId.length > 0)
    )
  ).sort();

const resolveFilterTagsResource = (catalogId: string | null): string =>
  catalogId !== null ? 'products.metadata.tags' : 'products.metadata.tags.all';

const resolveFilterTagsTags = (catalogId: string | null): string[] =>
  catalogId !== null
    ? ['products', 'metadata', 'tags', 'filters']
    : ['products', 'metadata', 'tags', 'all', 'filters'];

export function useCatalogs(options?: ProductMetadataQueryOptions): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<CatalogRecord[]> =>
      await api.get<CatalogRecord[]>('/api/v2/products/entities/catalogs'),
    enabled: resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'catalogs'],
      description: 'Loads products metadata catalogs.',
    },
  });
}

export function useCategories(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategory> {
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const queryKey = productMetadataKeys.categories(resolvedCatalogId);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategory[]> => {
      if (resolvedCatalogId === null) return [];
      const tree = await api.get<ProductCategoryWithChildren[]>(
        `/api/v2/products/categories/tree?catalogId=${encodeURIComponent(resolvedCatalogId)}`
      );
      return flattenCategoryTree(tree);
    },
    enabled: resolvedCatalogId !== null && resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useMetadataCategories',
      operation: 'list',
      resource: 'products.metadata.categories',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'categories'],
      description: 'Loads products metadata categories.',
    },
  });
}

export function useCategoriesForCatalogs(
  catalogIds: string[],
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategory> {
  const normalizedCatalogIds = normalizeCatalogIds(catalogIds);
  const queryKey = normalizeQueryKey([
    ...productMetadataKeys.all,
    'categories-flat-batch',
    normalizedCatalogIds,
  ]);

  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategory[]> => {
      if (normalizedCatalogIds.length === 0) return [];

      const grouped = await api.get<Record<string, ProductCategory[]>>(
        `/api/v2/products/categories/batch?catalogIds=${normalizedCatalogIds.map(encodeURIComponent).join(',')}`
      );

      return normalizedCatalogIds.flatMap((catalogId: string): ProductCategory[] => {
        const categories = grouped[catalogId];
        return Array.isArray(categories) ? categories : [];
      });
    },
    enabled: normalizedCatalogIds.length > 0 && resolveMetadataQueryEnabled(options),
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
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const queryKey = productMetadataKeys.tags(resolvedCatalogId);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (resolvedCatalogId === null) return [];
      return await api.get<ProductTag[]>(
        `/api/v2/products/tags?catalogId=${encodeURIComponent(resolvedCatalogId)}`
      );
    },
    enabled: resolvedCatalogId !== null && resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useMetadataTags',
      operation: 'list',
      resource: 'products.metadata.tags',
      domain: 'products',
      queryKey,
      tags: ['products', 'metadata', 'tags'],
      description: 'Loads products metadata tags.',
    },
  });
}

export function useFilterTags(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductTag> {
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const queryKey = productMetadataKeys.tags(resolvedCatalogId ?? '__all__');
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> => {
      if (resolvedCatalogId !== null) {
        return await api.get<ProductTag[]>(
          `/api/v2/products/tags?catalogId=${encodeURIComponent(resolvedCatalogId)}`
        );
      }
      return await api.get<ProductTag[]>('/api/v2/products/tags/all');
    },
    enabled: resolveMetadataQueryEnabled(options),
    ...STABLE_METADATA_QUERY_OPTIONS,
    meta: {
      source: 'products.hooks.useFilterTags',
      operation: 'list',
      resource: resolveFilterTagsResource(resolvedCatalogId),
      domain: 'products',
      queryKey,
      tags: resolveFilterTagsTags(resolvedCatalogId),
      description: 'Loads products filter tags for either a single catalog or all catalogs.',
    },
  });
}

export function useAllTags(options?: ProductMetadataQueryOptions): ListQuery<ProductTag> {
  const queryKey = productMetadataKeys.tags('__all__');
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductTag[]> =>
      await api.get<ProductTag[]>('/api/v2/products/tags/all'),
    enabled: resolveMetadataQueryEnabled(options),
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
  const resolvedCatalogId = normalizeOptionalIdentifier(catalogId);
  const queryKey = productMetadataKeys.shippingGroups(resolvedCatalogId);
  return useListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductShippingGroup[]> => {
      if (resolvedCatalogId === null) return [];
      return await api.get<ProductShippingGroup[]>(
        `/api/v2/products/shipping-groups?catalogId=${encodeURIComponent(resolvedCatalogId)}`
      );
    },
    enabled: resolvedCatalogId !== null && resolveMetadataQueryEnabled(options),
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
  return useMultiQueryV2({
    queries: catalogIds.map((catalogId: string) => {
      const queryKey = normalizeQueryKey(productMetadataKeys.tags(catalogId));
      return {
        queryKey,
        queryFn: async (): Promise<ProductTag[]> =>
          await api.get<ProductTag[]>(
            `/api/v2/products/tags?catalogId=${encodeURIComponent(catalogId)}`
          ),
        enabled: resolveMetadataQueryEnabled(options),
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
