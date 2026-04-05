import type { BulkCategoryMappingRequest } from '@/shared/contracts/integrations/base-com';
import type { BulkProducerMappingRequest } from '@/shared/contracts/integrations/producers';
import type { BulkTagMappingRequest } from '@/shared/contracts/integrations/listings';
import type { MarketplaceBulkUpsertResponse, MarketplaceConnectionRequest, MarketplaceFetchResponse } from '@/shared/contracts/integrations/marketplace';
import { api } from '@/shared/lib/api-client';
import { createMutationV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateMarketplaceCategories,
  invalidateMarketplaceMappings,
  invalidateMarketplaceProducerMappings,
  invalidateMarketplaceProducers,
  invalidateMarketplaceTagMappings,
  invalidateMarketplaceTags,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useFetchExternalCategoriesMutation() {
  return createMutationV2<MarketplaceFetchResponse, MarketplaceConnectionRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-categories'),
    mutationFn: (payload: MarketplaceConnectionRequest) =>
      api.post<MarketplaceFetchResponse>('/api/marketplace/categories/fetch', payload, {
        timeout: 150_000,
      }),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-categories',
      operation: 'action',
      resource: 'marketplace.categories.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'categories'],
      description: 'Runs marketplace categories fetch.',
    },
    invalidate: (queryClient, _data, { connectionId }) =>
      invalidateMarketplaceCategories(queryClient, connectionId),
  });
}

export function useSaveMappingsMutation() {
  return createUpdateMutationV2<MarketplaceBulkUpsertResponse, BulkCategoryMappingRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-mappings'),
    mutationFn: (payload: BulkCategoryMappingRequest) =>
      api.post<MarketplaceBulkUpsertResponse>('/api/marketplace/mappings/bulk', payload),
    meta: {
      source: 'integrations.hooks.marketplace.save-mappings',
      operation: 'update',
      resource: 'marketplace.mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'mappings'],
      description: 'Updates marketplace mappings bulk.',
    },
    invalidate: (queryClient, _data, { connectionId, catalogId }) =>
      invalidateMarketplaceMappings(queryClient, connectionId, catalogId),
  });
}

export function useFetchExternalProducersMutation() {
  return createMutationV2<MarketplaceFetchResponse, MarketplaceConnectionRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-producers'),
    mutationFn: (payload: MarketplaceConnectionRequest) =>
      api.post<MarketplaceFetchResponse>('/api/marketplace/producers/fetch', payload),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-producers',
      operation: 'action',
      resource: 'marketplace.producers.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'producers'],
      description: 'Runs marketplace producers fetch.',
    },
    invalidate: (queryClient, _data, { connectionId }) =>
      invalidateMarketplaceProducers(queryClient, connectionId),
  });
}

export function useSaveProducerMappingsMutation() {
  return createUpdateMutationV2<MarketplaceBulkUpsertResponse, BulkProducerMappingRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-producer-mappings'),
    mutationFn: (payload: BulkProducerMappingRequest) =>
      api.post<MarketplaceBulkUpsertResponse>(
        '/api/marketplace/producer-mappings/bulk',
        payload
      ),
    meta: {
      source: 'integrations.hooks.marketplace.save-producer-mappings',
      operation: 'update',
      resource: 'marketplace.producer-mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'producer-mappings'],
      description: 'Updates marketplace producer mappings bulk.',
    },
    invalidate: (queryClient, _data, { connectionId }) =>
      invalidateMarketplaceProducerMappings(queryClient, connectionId),
  });
}

export function useFetchExternalTagsMutation() {
  return createMutationV2<MarketplaceFetchResponse, MarketplaceConnectionRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-tags'),
    mutationFn: (payload: MarketplaceConnectionRequest) =>
      api.post<MarketplaceFetchResponse>('/api/marketplace/tags/fetch', payload),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-tags',
      operation: 'action',
      resource: 'marketplace.tags.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'tags'],
      description: 'Runs marketplace tags fetch.',
    },
    invalidate: (queryClient, _data, { connectionId }) =>
      invalidateMarketplaceTags(queryClient, connectionId),
  });
}

export function useSaveTagMappingsMutation() {
  return createUpdateMutationV2<MarketplaceBulkUpsertResponse, BulkTagMappingRequest>({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-tag-mappings'),
    mutationFn: (payload: BulkTagMappingRequest) =>
      api.post<MarketplaceBulkUpsertResponse>(
        '/api/marketplace/tag-mappings/bulk',
        payload
      ),
    meta: {
      source: 'integrations.hooks.marketplace.save-tag-mappings',
      operation: 'update',
      resource: 'marketplace.tag-mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'tag-mappings'],
      description: 'Updates marketplace tag mappings bulk.',
    },
    invalidate: (queryClient, _data, { connectionId }) =>
      invalidateMarketplaceTagMappings(queryClient, connectionId),
  });
}
