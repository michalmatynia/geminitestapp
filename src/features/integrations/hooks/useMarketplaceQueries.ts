'use client';

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
import {
  createListQuery,
} from '@/shared/lib/query-factories';
import { marketplaceKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery } from '@/shared/types/query-result-types';

export function useExternalCategories(connectionId: string): ListQuery<ExternalCategory> {
  return createListQuery({
    queryKey: marketplaceKeys.categories(connectionId),
    queryFn: () => api.get<ExternalCategory[]>(`/api/marketplace/categories?connectionId=${connectionId}`),
    options: {
      enabled: !!connectionId,
    }
  });
}

export function useCategoryMappings(connectionId: string, catalogId?: string | null): ListQuery<CategoryMappingWithDetails> {
  return createListQuery({
    queryKey: marketplaceKeys.mappings(connectionId, catalogId),
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (!catalogId) return [];
      return api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${catalogId}`
      );
    },
    options: {
      enabled: !!connectionId && !!catalogId,
    }
  });
}

export function useCategoryMappingsByConnection(
  connectionId: string,
  options?: { enabled?: boolean }
): ListQuery<CategoryMappingWithDetails> {
  const isEnabled = options?.enabled ?? !!connectionId;

  return createListQuery({
    queryKey: marketplaceKeys.mappings(connectionId, 'all'),
    queryFn: () => api.get<CategoryMappingWithDetails[]>(`/api/marketplace/mappings?connectionId=${connectionId}`),
    options: {
      enabled: isEnabled && !!connectionId,
    }
  });
}

export function useExternalProducers(connectionId: string): ListQuery<ExternalProducer> {
  return createListQuery({
    queryKey: marketplaceKeys.producers(connectionId),
    queryFn: () =>
      api.get<ExternalProducer[]>(`/api/marketplace/producers?connectionId=${connectionId}`),
    options: {
      enabled: !!connectionId,
    }
  });
}

export function useProducerMappings(
  connectionId: string
): ListQuery<ProducerMappingWithDetails> {
  return createListQuery({
    queryKey: marketplaceKeys.producerMappings(connectionId),
    queryFn: () =>
      api.get<ProducerMappingWithDetails[]>(
        `/api/marketplace/producer-mappings?connectionId=${connectionId}`
      ),
    options: {
      enabled: !!connectionId,
    }
  });
}

export function useExternalTags(connectionId: string): ListQuery<ExternalTag> {
  return createListQuery({
    queryKey: marketplaceKeys.tags(connectionId),
    queryFn: () => api.get<ExternalTag[]>(`/api/marketplace/tags?connectionId=${connectionId}`),
    options: {
      enabled: !!connectionId,
    }
  });
}

export function useTagMappings(
  connectionId: string
): ListQuery<TagMappingWithDetails> {
  return createListQuery({
    queryKey: marketplaceKeys.tagMappings(connectionId),
    queryFn: () =>
      api.get<TagMappingWithDetails[]>(
        `/api/marketplace/tag-mappings?connectionId=${connectionId}`
      ),
    options: {
      enabled: !!connectionId,
    }
  });
}
