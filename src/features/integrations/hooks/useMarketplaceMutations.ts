'use client';

import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  return createMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-categories'),
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>('/api/marketplace/categories/fetch', payload),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-categories',
      operation: 'action',
      resource: 'marketplace.categories.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'categories'],
    },
    onSuccess: async (_data, { connectionId }) => {
      await invalidateMarketplaceCategories(queryClient, connectionId);
    },
  });
}

export function useSaveMappingsMutation() {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-mappings'),
    mutationFn: (payload: {
      connectionId: string;
      catalogId: string;
      mappings: { externalCategoryId: string; internalCategoryId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>('/api/marketplace/mappings/bulk', payload),
    meta: {
      source: 'integrations.hooks.marketplace.save-mappings',
      operation: 'update',
      resource: 'marketplace.mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'mappings'],
    },
    onSuccess: async (_data, { connectionId, catalogId }) => {
      await invalidateMarketplaceMappings(queryClient, connectionId, catalogId);
    },
  });
}

export function useFetchExternalProducersMutation() {
  const queryClient = useQueryClient();
  return createMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-producers'),
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>('/api/marketplace/producers/fetch', payload),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-producers',
      operation: 'action',
      resource: 'marketplace.producers.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'producers'],
    },
    onSuccess: async (_data, { connectionId }) => {
      await invalidateMarketplaceProducers(queryClient, connectionId);
    },
  });
}

export function useSaveProducerMappingsMutation() {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-producer-mappings'),
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalProducerId: string; externalProducerId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/producer-mappings/bulk',
        payload
      ),
    meta: {
      source: 'integrations.hooks.marketplace.save-producer-mappings',
      operation: 'update',
      resource: 'marketplace.producer-mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'producer-mappings'],
    },
    onSuccess: async (_data, { connectionId }) => {
      await invalidateMarketplaceProducerMappings(queryClient, connectionId);
    },
  });
}

export function useFetchExternalTagsMutation() {
  const queryClient = useQueryClient();
  return createMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('fetch-tags'),
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>('/api/marketplace/tags/fetch', payload),
    meta: {
      source: 'integrations.hooks.marketplace.fetch-tags',
      operation: 'action',
      resource: 'marketplace.tags.fetch',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'tags'],
    },
    onSuccess: async (_data, { connectionId }) => {
      await invalidateMarketplaceTags(queryClient, connectionId);
    },
  });
}

export function useSaveTagMappingsMutation() {
  const queryClient = useQueryClient();
  return createUpdateMutationV2({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('save-tag-mappings'),
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalTagId: string; externalTagId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/tag-mappings/bulk',
        payload
      ),
    meta: {
      source: 'integrations.hooks.marketplace.save-tag-mappings',
      operation: 'update',
      resource: 'marketplace.tag-mappings.bulk',
      domain: 'integrations',
      tags: ['integrations', 'marketplace', 'tag-mappings'],
    },
    onSuccess: async (_data, { connectionId }) => {
      await invalidateMarketplaceTagMappings(queryClient, connectionId);
    },
  });
}
