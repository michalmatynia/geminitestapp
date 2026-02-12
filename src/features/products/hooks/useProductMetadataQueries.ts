'use client';

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getLanguages } from '@/features/internationalization/api';
import type {
  CatalogRecord,
  PriceGroupWithDetails,
  Producer,
  ProductCategory,
  ProductParameter,
  ProductTag,
} from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { invalidateProductMetadata } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { Language } from '@/shared/types/domain/internationalization';

export const productMetadataKeys = QUERY_KEYS.products.metadata;

export function useCatalogs(): UseQueryResult<CatalogRecord[]> {
  return useQuery({
    queryKey: productMetadataKeys.catalogs,
    queryFn: async (): Promise<CatalogRecord[]> => await api.get<CatalogRecord[]>('/api/catalogs'),
  });
}

export function useCategories(catalogId?: string): UseQueryResult<ProductCategory[]> {
  return useQuery({
    queryKey: productMetadataKeys.categories(catalogId ?? null),
    queryFn: async (): Promise<ProductCategory[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategory[]>(
        `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
  });
}

export function useMultiCategories(catalogIds: string[]): UseQueryResult<ProductCategory[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: productMetadataKeys.categories(catalogId),
      queryFn: async (): Promise<ProductCategory[]> =>
        await api.get<ProductCategory[]>(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}

export function useTags(catalogId?: string): UseQueryResult<ProductTag[]> {
  return useQuery({
    queryKey: productMetadataKeys.tags(catalogId ?? null),
    queryFn: async (): Promise<ProductTag[]> => {
      if (!catalogId) return [];
      return await api.get<ProductTag[]>(
        `/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
  });
}

export function useMultiTags(catalogIds: string[]): UseQueryResult<ProductTag[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: productMetadataKeys.tags(catalogId),
      queryFn: async (): Promise<ProductTag[]> =>
        await api.get<ProductTag[]>(`/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`),
    })),
  });
}

export function useProducers(): UseQueryResult<Producer[]> {
  return useQuery({
    queryKey: productMetadataKeys.producers,
    queryFn: async (): Promise<Producer[]> => await api.get<Producer[]>('/api/products/producers'),
  });
}

export function useSaveProducerMutation(): UseMutationResult<
  Producer,
  Error,
  { id: string | undefined; data: { name: string; website: string | null } }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      id
        ? api.put<Producer>(`/api/products/producers/${id}`, data)
        : api.post<Producer>('/api/products/producers', data),
    onSuccess: () => {
      void invalidateProductMetadata(queryClient);
    },
  });
}

export function useDeleteProducerMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/products/producers/${id}`),
    onSuccess: () => {
      void invalidateProductMetadata(queryClient);
    },
  });
}

export function useParameters(catalogId?: string): UseQueryResult<ProductParameter[]> {
  return useQuery({
    queryKey: productMetadataKeys.parameters(catalogId ?? null),
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>(
        `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
  });
}

export function useMultiParameters(catalogIds: string[]): UseQueryResult<ProductParameter[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: productMetadataKeys.parameters(catalogId),
      queryFn: async (): Promise<ProductParameter[]> =>
        await api.get<ProductParameter[]>(
          `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}

export function useLanguages(): UseQueryResult<Language[]> {
  return useQuery({
    queryKey: productMetadataKeys.languages,
    queryFn: async (): Promise<Language[]> => getLanguages(),
  });
}

export function usePriceGroups(): UseQueryResult<PriceGroupWithDetails[]> {
  return useQuery({
    queryKey: productMetadataKeys.priceGroups,
    queryFn: async (): Promise<PriceGroupWithDetails[]> =>
      await api.get<PriceGroupWithDetails[]>('/api/price-groups'),
  });
}
