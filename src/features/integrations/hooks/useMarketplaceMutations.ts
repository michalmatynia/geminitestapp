'use client';

import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { createCreateMutation } from '@/shared/lib/query-factories';
import {
  invalidateMarketplaceCategories,
  invalidateMarketplaceMappings,
  invalidateMarketplaceProducerMappings,
  invalidateMarketplaceProducers,
  invalidateMarketplaceTagMappings,
  invalidateMarketplaceTags,
} from '@/shared/lib/query-invalidation';
import type { UpdateMutation } from '@/shared/types/query-result-types';

export function useFetchExternalCategoriesMutation(): UpdateMutation<
  { fetched: number; message: string },
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: { connectionId: string }) => api.post<{ fetched: number; message: string }>('/api/marketplace/categories/fetch', payload),
    options: {
      onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
        void invalidateMarketplaceCategories(queryClient, connectionId);
      },
    },
  });
}

export function useSaveMappingsMutation(): UpdateMutation<
  { upserted: number; message: string },
  { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }) => 
      api.post<{ upserted: number; message: string }>('/api/marketplace/mappings/bulk', payload),
    options: {
      onSuccess: (_: { upserted: number; message: string }, { connectionId, catalogId }: { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }) => {
        void invalidateMarketplaceMappings(queryClient, connectionId, catalogId);
      },
    },
  });
}

export function useFetchExternalProducersMutation(): UpdateMutation<
  { fetched: number; message: string },
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/producers/fetch',
        payload
      ),
    options: {
      onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
        void invalidateMarketplaceProducers(queryClient, connectionId);
      },
    },
  });
}

export function useSaveProducerMappingsMutation(): UpdateMutation<
  { upserted: number; message: string },
  {
    connectionId: string;
    mappings: { internalProducerId: string; externalProducerId: string | null }[];
  }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalProducerId: string; externalProducerId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/producer-mappings/bulk',
        payload
      ),
    options: {
      onSuccess: (_: { upserted: number; message: string }, { connectionId }) => {
        void invalidateMarketplaceProducerMappings(queryClient, connectionId);
      },
    },
  });
}

export function useFetchExternalTagsMutation(): UpdateMutation<
  { fetched: number; message: string },
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/tags/fetch',
        payload
      ),
    options: {
      onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
        void invalidateMarketplaceTags(queryClient, connectionId);
      },
    },
  });
}

export function useSaveTagMappingsMutation(): UpdateMutation<
  { upserted: number; message: string },
  {
    connectionId: string;
    mappings: { internalTagId: string; externalTagId: string | null }[];
  }
  > {
  const queryClient = useQueryClient();

  return createCreateMutation({
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalTagId: string; externalTagId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/tag-mappings/bulk',
        payload
      ),
    options: {
      onSuccess: (_: { upserted: number; message: string }, { connectionId }) => {
        void invalidateMarketplaceTagMappings(queryClient, connectionId);
      },
    },
  });
}
