'use client';

import { createPostMutation } from '@/shared/lib/api-hooks';
import {
  invalidateMarketplaceCategories,
  invalidateMarketplaceMappings,
  invalidateMarketplaceProducerMappings,
  invalidateMarketplaceProducers,
  invalidateMarketplaceTagMappings,
  invalidateMarketplaceTags,
} from '@/shared/lib/query-invalidation';

export function useFetchExternalCategoriesMutation() {
  return createPostMutation<{ fetched: number; message: string }, { connectionId: string }>({
    endpoint: '/api/marketplace/categories/fetch',
    onSuccess: (_data, { connectionId }, _context, queryClient) => {
      void invalidateMarketplaceCategories(queryClient, connectionId);
    },
  });
}

export function useSaveMappingsMutation() {
  return createPostMutation<
    { upserted: number; message: string },
    { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }
  >({
    endpoint: '/api/marketplace/mappings/bulk',
    onSuccess: (_data, { connectionId, catalogId }, _context, queryClient) => {
      void invalidateMarketplaceMappings(queryClient, connectionId, catalogId);
    },
  });
}

export function useFetchExternalProducersMutation() {
  return createPostMutation<{ fetched: number; message: string }, { connectionId: string }>({
    endpoint: '/api/marketplace/producers/fetch',
    onSuccess: (_data, { connectionId }, _context, queryClient) => {
      void invalidateMarketplaceProducers(queryClient, connectionId);
    },
  });
}

export function useSaveProducerMappingsMutation() {
  return createPostMutation<
    { upserted: number; message: string },
    {
      connectionId: string;
      mappings: { internalProducerId: string; externalProducerId: string | null }[];
    }
  >({
    endpoint: '/api/marketplace/producer-mappings/bulk',
    onSuccess: (_data, { connectionId }, _context, queryClient) => {
      void invalidateMarketplaceProducerMappings(queryClient, connectionId);
    },
  });
}

export function useFetchExternalTagsMutation() {
  return createPostMutation<{ fetched: number; message: string }, { connectionId: string }>({
    endpoint: '/api/marketplace/tags/fetch',
    onSuccess: (_data, { connectionId }, _context, queryClient) => {
      void invalidateMarketplaceTags(queryClient, connectionId);
    },
  });
}

export function useSaveTagMappingsMutation() {
  return createPostMutation<
    { upserted: number; message: string },
    {
      connectionId: string;
      mappings: { internalTagId: string; externalTagId: string | null }[];
    }
  >({
    endpoint: '/api/marketplace/tag-mappings/bulk',
    onSuccess: (_data, { connectionId }, _context, queryClient) => {
      void invalidateMarketplaceTagMappings(queryClient, connectionId);
    },
  });
}

