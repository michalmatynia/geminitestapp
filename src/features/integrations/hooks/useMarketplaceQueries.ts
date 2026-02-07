'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ExternalCategory, CategoryMappingWithDetails } from '@/features/integrations/types/category-mapping';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const marketplaceKeys = QUERY_KEYS.integrations.marketplace;

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