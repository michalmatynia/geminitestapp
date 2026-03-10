import type {
  CatalogRecord,
  Producer,
  ProductCategory,
  ProductCategoryWithChildren,
  ProductTag,
} from '@/shared/contracts/products';
import type { ProductFilter } from '@/shared/contracts/products/filters';
import type {
  ProductWithImages,
  ProductsPagedResult,
} from '@/shared/contracts/products/product';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createPaginatedListQueryV2,
} from '@/shared/lib/query-factories-v2';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const PRODUCTS_STALE_MS = 60_000;

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

const getProductsPagedQueryKey = (filters: ProductFilter) =>
  [...QUERY_KEYS.products.lists(), 'paged', { filters }] as const;

export function useIntegrationCatalogs(): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CatalogRecord[]> =>
      await api.get<CatalogRecord[]>('/api/v2/products/entities/catalogs'),
    meta: {
      source: 'integrations.hooks.useIntegrationCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'products', 'catalogs'],
      description: 'Loads product catalogs for integrations.'},
  });
}

export function useIntegrationProductCategories(catalogId?: string): ListQuery<ProductCategory> {
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
      source: 'integrations.hooks.useIntegrationProductCategories',
      operation: 'list',
      resource: 'products.metadata.categories',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'products', 'categories'],
      description: 'Loads product categories for integrations.'},
  });
}

export function useIntegrationProductTags(catalogId?: string): ListQuery<ProductTag> {
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
      source: 'integrations.hooks.useIntegrationProductTags',
      operation: 'list',
      resource: 'products.metadata.tags',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'products', 'tags'],
      description: 'Loads product tags for integrations.'},
  });
}

export function useIntegrationProductProducers(): ListQuery<Producer> {
  const queryKey = productMetadataKeys.producers();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<Producer[]> =>
      await api.get<Producer[]>('/api/v2/products/producers'),
    meta: {
      source: 'integrations.hooks.useIntegrationProductProducers',
      operation: 'list',
      resource: 'products.metadata.producers',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'products', 'producers'],
      description: 'Loads product producers for integrations.'},
  });
}

export function useIntegrationProductsWithCount(
  filters: ProductFilter,
  options: { enabled?: boolean } = {}
): {
  products: ProductWithImages[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
} {
  const enabled = options.enabled ?? true;
  const queryKey = getProductsPagedQueryKey(filters);
  const query = createPaginatedListQueryV2<ProductWithImages>({
    id: `${JSON.stringify(filters)}:paged`,
    queryKey,
    queryFn: async () => {
      const result = await api.get<ProductsPagedResult>('/api/v2/products/paged', {
        params: filters,
        cache: 'no-store',
      });
      return {
        items: result.products,
        total: result.total,
      };
    },
    staleTime: PRODUCTS_STALE_MS,
    refetchOnMount: true,
    enabled,
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load products.'),
    meta: {
      source: 'integrations.hooks.useIntegrationProductsWithCount',
      operation: 'list',
      resource: 'products.paged',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'products', 'list', 'count'],
      description: 'Loads paginated products and total count for integrations.'},
  });

  return {
    products: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
  };
}
