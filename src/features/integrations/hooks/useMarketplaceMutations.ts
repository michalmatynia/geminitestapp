'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const marketplaceKeys = QUERY_KEYS.integrations.marketplace;

export function useFetchExternalCategoriesMutation(): UseMutationResult<
  { fetched: number; message: string },
  Error,
  { connectionId: string }
  > {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { connectionId: string }) => api.post<{ fetched: number; message: string }>('/api/marketplace/categories/fetch', payload),
    onSuccess: (_: { fetched: number; message: string }, { connectionId }: { connectionId: string }) => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.categories(connectionId) });
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
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.mappings(connectionId, catalogId) });
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
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.producers(connectionId) });
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
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.producerMappings(connectionId),
      });
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
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.tags(connectionId) });
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
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.tagMappings(connectionId),
      });
    },
  });
}
