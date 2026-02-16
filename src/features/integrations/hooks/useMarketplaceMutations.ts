'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import {
  invalidateMarketplaceCategories,
  invalidateMarketplaceMappings,
  invalidateMarketplaceProducerMappings,
  invalidateMarketplaceProducers,
  invalidateMarketplaceTagMappings,
  invalidateMarketplaceTags,
} from '@/shared/lib/query-invalidation';

export function useFetchExternalCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { connectionId: string }) => api.post<{ fetched: number; message: string }>('/api/marketplace/categories/fetch', payload),
    onSuccess: (_data, { connectionId }) => {
      void invalidateMarketplaceCategories(queryClient, connectionId);
    },
  });
}

export function useSaveMappingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }) => 
      api.post<{ upserted: number; message: string }>('/api/marketplace/mappings/bulk', payload),
    onSuccess: (_data, { connectionId, catalogId }) => {
      void invalidateMarketplaceMappings(queryClient, connectionId, catalogId);
    },
  });
}

export function useFetchExternalProducersMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/producers/fetch',
        payload
      ),
    onSuccess: (_data, { connectionId }) => {
      void invalidateMarketplaceProducers(queryClient, connectionId);
    },
  });
}

export function useSaveProducerMappingsMutation() {
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
    onSuccess: (_data, { connectionId }) => {
      void invalidateMarketplaceProducerMappings(queryClient, connectionId);
    },
  });
}

export function useFetchExternalTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { connectionId: string }) =>
      api.post<{ fetched: number; message: string }>(
        '/api/marketplace/tags/fetch',
        payload
      ),
    onSuccess: (_data, { connectionId }) => {
      void invalidateMarketplaceTags(queryClient, connectionId);
    },
  });
}

export function useSaveTagMappingsMutation() {
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
    onSuccess: (_data, { connectionId }) => {
      void invalidateMarketplaceTagMappings(queryClient, connectionId);
    },
  });
}

