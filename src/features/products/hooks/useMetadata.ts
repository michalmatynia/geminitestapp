
'use client';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { getLanguages } from '@/features/internationalization/api';
import type {
  CatalogRecord,
  PriceGroupWithDetails,
} from '@/features/products/types';
import type {
  ProductCategory,
  ProductTag,
  ProductParameter,
} from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import type { Language } from '@/shared/types/domain/internationalization';

export function useCatalogs(): UseQueryResult<CatalogRecord[]> {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => await api.get<CatalogRecord[]>('/api/catalogs'),
  });
}

export function useLanguages(): UseQueryResult<Language[]> {
  return useQuery({
    queryKey: ['languages'],
    queryFn: async () => getLanguages(),
  });
}

export function usePriceGroups(): UseQueryResult<PriceGroupWithDetails[]> {
  return useQuery({
    queryKey: ['price-groups'],
    queryFn: async () => await api.get<PriceGroupWithDetails[]>('/api/price-groups'),
  });
}

export function useCategories(catalogId?: string): UseQueryResult<ProductCategory[]> {
  return useQuery({
    queryKey: ['categories', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductCategory[];
      return await api.get<ProductCategory[]>(
        `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: !!catalogId,
  });
}

export function useMultiCategories(catalogIds: string[]): UseQueryResult<ProductCategory[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['categories', catalogId],
      queryFn: async (): Promise<ProductCategory[]> =>
        await api.get<ProductCategory[]>(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}

export function useTags(catalogId?: string): UseQueryResult<ProductTag[]> {
  return useQuery({
    queryKey: ['tags', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductTag[];
      return await api.get<ProductTag[]>(`/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`);
    },
    enabled: !!catalogId,
  });
}

export function useMultiTags(catalogIds: string[]): UseQueryResult<ProductTag[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['tags', catalogId],
      queryFn: async (): Promise<ProductTag[]> =>
        await api.get<ProductTag[]>(`/api/products/tags?catalogId=${encodeURIComponent(catalogId)}`),
    })),
  });
}

export function useParameters(catalogId?: string): UseQueryResult<ProductParameter[]> {
  return useQuery({
    queryKey: ['parameters', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductParameter[];
      return await api.get<ProductParameter[]>(
        `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: !!catalogId,
  });
}

export function useMultiParameters(catalogIds: string[]): UseQueryResult<ProductParameter[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['parameters', catalogId],
      queryFn: async (): Promise<ProductParameter[]> =>
        await api.get<ProductParameter[]>(
          `/api/products/parameters?catalogId=${encodeURIComponent(catalogId)}`
        ),
    })),
  });
}
