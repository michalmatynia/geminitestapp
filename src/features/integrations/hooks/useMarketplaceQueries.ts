import type { ExternalCategory, CategoryMappingWithDetails, ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ExternalProducer, ProducerMappingWithDetails } from '@/shared/contracts/integrations/producers';
import type { ExternalTag, TagMappingWithDetails } from '@/shared/contracts/integrations/listings';
export { useCategoryMappingsByConnection } from '@/shared/hooks/useIntegrationQueries';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { marketplaceKeys } from '@/shared/lib/query-key-exports';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type ExternalCategoryMarketplaceScope = 'tradera' | null | undefined;

export function useExternalCategories(
  connectionId: string,
  marketplace?: ExternalCategoryMarketplaceScope
): ListQuery<ExternalCategory> {
  const queryScope = marketplace ?? connectionId;
  const queryKey = marketplaceKeys.categories(queryScope);
  return createListQueryV2({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (connectionId.length > 0) params.set('connectionId', connectionId);
      if (marketplace !== null && marketplace !== undefined) {
        params.set('marketplace', marketplace);
      }
      return api.get<ExternalCategory[]>(`/api/marketplace/categories?${params.toString()}`);
    },
    enabled:
      connectionId.length > 0 || (marketplace !== null && marketplace !== undefined),
    meta: {
      source: 'integrations.hooks.useExternalCategories',
      operation: 'list',
      resource: 'marketplace.categories',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'categories'],
      description: 'Loads marketplace categories.'},
  });
}

export function useCategoryMappings(
  connectionId: string,
  catalogId?: string | null,
  marketplace?: ExternalCategoryMarketplaceScope
): ListQuery<CategoryMappingWithDetails> {
  const queryScope = marketplace ?? connectionId;
  const isMarketplaceScoped = marketplace === 'tradera';
  const scopedCatalogId = isMarketplaceScoped ? null : catalogId;
  const queryKey = marketplaceKeys.mappings(queryScope, scopedCatalogId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (
        !isMarketplaceScoped &&
        (catalogId === null || catalogId === undefined || catalogId.length === 0)
      ) {
        return [];
      }
      const params = new URLSearchParams();
      if (connectionId.length > 0) params.set('connectionId', connectionId);
      if (marketplace !== null && marketplace !== undefined) {
        params.set('marketplace', marketplace);
      }
      if (!isMarketplaceScoped && catalogId !== null && catalogId !== undefined) {
        params.set('catalogId', catalogId);
      }
      return api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?${params.toString()}`
      );
    },
    enabled:
      (connectionId.length > 0 || (marketplace !== null && marketplace !== undefined)) &&
      (isMarketplaceScoped ||
        (catalogId !== null &&
          catalogId !== undefined &&
          catalogId.length > 0)),
    meta: {
      source: 'integrations.hooks.useCategoryMappings',
      operation: 'list',
      resource: 'marketplace.mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'mappings'],
      description: 'Loads marketplace mappings.'},
  });
}

export function useExternalProducers(connectionId: string): ListQuery<ExternalProducer> {
  const queryKey = marketplaceKeys.producers(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<ExternalProducer[]>(`/api/marketplace/producers?connectionId=${connectionId}`),
    enabled: Boolean(connectionId),
    meta: {
      source: 'integrations.hooks.useExternalProducers',
      operation: 'list',
      resource: 'marketplace.producers',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'producers'],
      description: 'Loads marketplace producers.'},
  });
}

export function useProducerMappings(connectionId: string): ListQuery<ProducerMappingWithDetails> {
  const queryKey = marketplaceKeys.producerMappings(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<ProducerMappingWithDetails[]>(
        `/api/marketplace/producer-mappings?connectionId=${connectionId}`
      ),
    enabled: Boolean(connectionId),
    meta: {
      source: 'integrations.hooks.useProducerMappings',
      operation: 'list',
      resource: 'marketplace.producer-mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'producer-mappings'],
      description: 'Loads marketplace producer mappings.'},
  });
}

export function useExternalTags(connectionId: string): ListQuery<ExternalTag> {
  const queryKey = marketplaceKeys.tags(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<ExternalTag[]>(`/api/marketplace/tags?connectionId=${connectionId}`),
    enabled: Boolean(connectionId),
    meta: {
      source: 'integrations.hooks.useExternalTags',
      operation: 'list',
      resource: 'marketplace.tags',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'tags'],
      description: 'Loads marketplace tags.'},
  });
}

export function useTagMappings(connectionId: string): ListQuery<TagMappingWithDetails> {
  const queryKey = marketplaceKeys.tagMappings(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<TagMappingWithDetails[]>(
        `/api/marketplace/tag-mappings?connectionId=${connectionId}`
      ),
    enabled: Boolean(connectionId),
    meta: {
      source: 'integrations.hooks.useTagMappings',
      operation: 'list',
      resource: 'marketplace.tag-mappings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'tag-mappings'],
      description: 'Loads marketplace tag mappings.'},
  });
}

export function useMarketplaceBadgeStatus(
  productId: string,
  marketplace: string,
  enabled: boolean = true
): { status: string | null; isFetching: boolean } {
  const queryKey = QUERY_KEYS.integrations.listings(productId);
  const { data: listings, isFetching } = createListQueryV2<
    ProductListingWithDetails,
    ProductListingWithDetails[]
  >({
    queryKey,
    queryFn: () =>
      api.get<ProductListingWithDetails[]>(
        `/api/v2/integrations/products/${productId}/listings`,
        { cache: 'no-store' }
    ),
    enabled: enabled && Boolean(productId),
    staleTime: 30000,
    meta: {
      source: 'integrations.hooks.useMarketplaceBadgeStatus',
      operation: 'list',
      resource: 'integrations.product-listings',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'badges'],
      description: 'Loads marketplace listing status badges for a product.',
    },
  });

  const status = (listings ?? []).find((l) => l.integration.slug === marketplace)?.status ?? null;

  return { status, isFetching };
}
