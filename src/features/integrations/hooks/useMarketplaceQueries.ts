'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ExternalCategory, CategoryMappingWithDetails } from '@/features/integrations/types/category-mapping';

export function useExternalCategories(connectionId: string): UseQueryResult<ExternalCategory[]> {
  return useQuery({
    queryKey: ['marketplace-categories', connectionId],
    queryFn: async (): Promise<ExternalCategory[]> => {
      const res = await fetch(`/api/marketplace/categories?connectionId=${connectionId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch external categories');
      }
      return (await res.json()) as ExternalCategory[];
    },
    enabled: !!connectionId,
  });
}

export function useCategoryMappings(connectionId: string, catalogId?: string | null): UseQueryResult<CategoryMappingWithDetails[]> {
  return useQuery({
    queryKey: ['category-mappings', connectionId, catalogId],
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      if (!catalogId) return [];
      const res = await fetch(
        `/api/marketplace/mappings?connectionId=${connectionId}&catalogId=${catalogId}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch mappings');
      }
      return (await res.json()) as CategoryMappingWithDetails[];
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
    queryKey: ['category-mappings', connectionId, 'all'],
    queryFn: async (): Promise<CategoryMappingWithDetails[]> => {
      const res = await fetch(`/api/marketplace/mappings?connectionId=${connectionId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch mappings');
      }
      return (await res.json()) as CategoryMappingWithDetails[];
    },
    enabled: isEnabled && !!connectionId,
  });
}
