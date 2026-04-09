import type { ExternalCategory, CategoryMappingWithDetails, ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ExternalProducer, ProducerMappingWithDetails } from '@/shared/contracts/integrations/producers';
import type { ExternalTag, TagMappingWithDetails } from '@/shared/contracts/integrations/listings';
export { useCategoryMappingsByConnection } from '@/shared/hooks/useIntegrationQueries';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { marketplaceKeys } from '@/shared/lib/query-key-exports';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useExternalCategories(connectionId: string): ListQuery<ExternalCategory> {
  const queryKey = marketplaceKeys.categories(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<ExternalCategory[]>(`/api/marketplace/categories?connectionId=${connectionId}`),
    enabled: !!connectionId,
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
  catalogId?: string | null
): ListQuery<CategoryMappingWithDetails> {
  const queryKey = marketplaceKeys.mappings(connectionId, catalogId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (!catalogId) return [];
      return api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${catalogId}`
      );
    },
    enabled: !!connectionId && !!catalogId,
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
    enabled: !!connectionId,
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
    enabled: !!connectionId,
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
    enabled: !!connectionId,
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
    enabled: !!connectionId,
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

import { useQuery } from '@tanstack/react-query';

export function useMarketplaceBadgeStatus(
  productId: string,
  marketplace: string,
  enabled: boolean = true
): { status: string | null; isFetching: boolean } {
  const { data: listings, isFetching } = useQuery<ProductListingWithDetails[]>({
    queryKey: QUERY_KEYS.integrations.listings(productId),
    queryFn: () =>
      api.get<ProductListingWithDetails[]>(
        `/api/v2/integrations/products/${productId}/listings`,
        { cache: 'no-store' }
      ),
    enabled: enabled && !!productId,
    staleTime: 30000,
  });

  const status = (listings ?? []).find((l) => l.integration?.slug === marketplace)?.status ?? null;

  return { status, isFetching };
}
