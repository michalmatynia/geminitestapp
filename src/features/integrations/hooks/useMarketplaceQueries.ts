'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ExternalCategory, CategoryMappingWithDetails } from '@/features/integrations/types/category-mapping';
import type {
  ExternalProducer,
  ProducerMappingWithDetails,
} from '@/features/integrations/types/producer-mapping';
import type {
  ExternalTag,
  TagMappingWithDetails,
} from '@/features/integrations/types/tag-mapping';
import { api } from '@/shared/lib/api-client';
import { marketplaceKeys } from '@/shared/lib/query-key-exports';


export function useExternalCategories(connectionId: string): UseQueryResult<ExternalCategory[]> {
  return useQuery({
    queryKey: marketplaceKeys.categories(connectionId),
    queryFn: () => api.get<ExternalCategory[]>(`/api/marketplace/categories?connectionId=${connectionId}`),
    enabled: !!connectionId,
  });
}

export function useCategoryMappings(connectionId: string, catalogId?: string | null): UseQueryResult<CategoryMappingWithDetails[]> {
  return useQuery({
    queryKey: marketplaceKeys.mappings(connectionId, catalogId),
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (!catalogId) return [];
      return api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${catalogId}`
      );
    },
    enabled: !!connectionId && !!catalogId,
  });
}

export function useCategoryMappingsByConnection(
  connectionId: string,
  options?: { enabled?: boolean }
): UseQueryResult<CategoryMappingWithDetails[]> {
  const isEnabled = options?.enabled ?? !!connectionId;

  return useQuery({
    queryKey: marketplaceKeys.mappings(connectionId, 'all'),
    queryFn: () => api.get<CategoryMappingWithDetails[]>(`/api/marketplace/mappings?connectionId=${connectionId}`),
    enabled: isEnabled && !!connectionId,
  });
}

export function useExternalProducers(connectionId: string): UseQueryResult<ExternalProducer[]> {
  return useQuery({
    queryKey: marketplaceKeys.producers(connectionId),
    queryFn: () =>
      api.get<ExternalProducer[]>(`/api/marketplace/producers?connectionId=${connectionId}`),
    enabled: !!connectionId,
  });
}

export function useProducerMappings(
  connectionId: string
): UseQueryResult<ProducerMappingWithDetails[]> {
  return useQuery({
    queryKey: marketplaceKeys.producerMappings(connectionId),
    queryFn: () =>
      api.get<ProducerMappingWithDetails[]>(
        `/api/marketplace/producer-mappings?connectionId=${connectionId}`
      ),
    enabled: !!connectionId,
  });
}

export function useExternalTags(connectionId: string): UseQueryResult<ExternalTag[]> {
  return useQuery({
    queryKey: marketplaceKeys.tags(connectionId),
    queryFn: () => api.get<ExternalTag[]>(`/api/marketplace/tags?connectionId=${connectionId}`),
    enabled: !!connectionId,
  });
}

export function useTagMappings(
  connectionId: string
): UseQueryResult<TagMappingWithDetails[]> {
  return useQuery({
    queryKey: marketplaceKeys.tagMappings(connectionId),
    queryFn: () =>
      api.get<TagMappingWithDetails[]>(
        `/api/marketplace/tag-mappings?connectionId=${connectionId}`
      ),
    enabled: !!connectionId,
  });
}
