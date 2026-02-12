'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  invalidateMarketplaceCategories,
  invalidateMarketplaceMappings,
  invalidateMarketplaceProducerMappings,
  invalidateMarketplaceProducers,
  invalidateMarketplaceTagMappings,
  invalidateMarketplaceTags,
} from '@/shared/lib/query-invalidation';

export function useFetchExternalCategoriesMutation(): UseMutationResult<
  { fetched: number; message: string },
  Error,
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { connectionId: string }) => api.post<{ fetched: number; message: string }>('/api/marketplace/categories/fetch', payload),
    onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
      void invalidateMarketplaceCategories(queryClient, connectionId);
    },
  });
}

export function useSaveMappingsMutation(): UseMutationResult<
  { upserted: number; message: string },
  Error,
  { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }) => 
      api.post<{ upserted: number; message: string }>('/api/marketplace/mappings/bulk', payload),
    onSuccess: (_: { upserted: number; message: string }, { connectionId, catalogId }: { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }) => {
      void invalidateMarketplaceMappings(queryClient, connectionId, catalogId);
    },
  });
}

export function useFetchExternalProducersMutation(): UseMutationResult<
  { fetched: number; message: string },
  Error,
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/producers/fetch',
        payload
      ),
    onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
      void invalidateMarketplaceProducers(queryClient, connectionId);
    },
  });
}

export function useSaveProducerMappingsMutation(): UseMutationResult<
  { upserted: number; message: string },
  Error,
  {
    connectionId: string;
    mappings: { internalProducerId: string; externalProducerId: string | null }[];
  }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalProducerId: string; externalProducerId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/producer-mappings/bulk',
        payload
      ),
    onSuccess: (_: { upserted: number; message: string }, { connectionId }) => {
      void invalidateMarketplaceProducerMappings(queryClient, connectionId);
    },
  });
}

export function useFetchExternalTagsMutation(): UseMutationResult<
  { fetched: number; message: string },
  Error,
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/tags/fetch',
        payload
      ),
    onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
      void invalidateMarketplaceTags(queryClient, connectionId);
    },
  });
}

export function useSaveTagMappingsMutation(): UseMutationResult<
  { upserted: number; message: string },
  Error,
  {
    connectionId: string;
    mappings: { internalTagId: string; externalTagId: string | null }[];
  }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      connectionId: string;
      mappings: { internalTagId: string; externalTagId: string | null }[];
    }) =>
      api.post<{ upserted: number; message: string }>(
        '/api/marketplace/tag-mappings/bulk',
        payload
      ),
    onSuccess: (_: { upserted: number; message: string }, { connectionId }) => {
      void invalidateMarketplaceTagMappings(queryClient, connectionId);
    },
  });
}
