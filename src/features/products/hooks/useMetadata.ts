
'use client';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import type {
  CatalogRecord,
  PriceGroupWithDetails,
} from '@/features/products/types';
import type {
  ProductCategory,
  ProductTag,
  ProductParameter,
} from '@/features/products/types';
import type { Language } from '@/shared/types/internationalization';

export function useCatalogs(): UseQueryResult<CatalogRecord[]> {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const res = await fetch('/api/catalogs');
      if (!res.ok) throw new Error('Failed to fetch catalogs');
      return (await res.json()) as CatalogRecord[];
    },
  });
}

export function useLanguages(): UseQueryResult<Language[]> {
  return useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const res = await fetch('/api/languages');
      if (!res.ok) throw new Error('Failed to fetch languages');
      return (await res.json()) as Language[];
    },
  });
}

export function usePriceGroups(): UseQueryResult<PriceGroupWithDetails[]> {
  return useQuery({
    queryKey: ['price-groups'],
    queryFn: async () => {
      const res = await fetch('/api/price-groups');
      if (!res.ok) throw new Error('Failed to fetch price groups');
      return (await res.json()) as PriceGroupWithDetails[];
    },
  });
}

export function useCategories(catalogId?: string): UseQueryResult<ProductCategory[]> {
  return useQuery({
    queryKey: ['categories', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductCategory[];
      const res = await fetch(
        `/api/products/categories?catalogId=${catalogId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch categories');
      return (await res.json()) as ProductCategory[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiCategories(catalogIds: string[]): UseQueryResult<ProductCategory[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['categories', catalogId],
      queryFn: async (): Promise<ProductCategory[]> => {
        const res = await fetch(
          `/api/products/categories?catalogId=${catalogId}`,
        );
        if (!res.ok) throw new Error('Failed to fetch categories');
        return (await res.json()) as ProductCategory[];
      },
    })),
  });
}

export function useTags(catalogId?: string): UseQueryResult<ProductTag[]> {
  return useQuery({
    queryKey: ['tags', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductTag[];
      const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      return (await res.json()) as ProductTag[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiTags(catalogIds: string[]): UseQueryResult<ProductTag[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['tags', catalogId],
      queryFn: async (): Promise<ProductTag[]> => {
        const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
        if (!res.ok) throw new Error('Failed to fetch tags');
        return (await res.json()) as ProductTag[];
      },
    })),
  });
}

export function useParameters(catalogId?: string): UseQueryResult<ProductParameter[]> {
  return useQuery({
    queryKey: ['parameters', catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductParameter[];
      const res = await fetch(
        `/api/products/parameters?catalogId=${catalogId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch parameters');
      return (await res.json()) as ProductParameter[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiParameters(catalogIds: string[]): UseQueryResult<ProductParameter[]>[] {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ['parameters', catalogId],
      queryFn: async (): Promise<ProductParameter[]> => {
        const res = await fetch(
          `/api/products/parameters?catalogId=${catalogId}`,
        );
        if (!res.ok) throw new Error('Failed to fetch parameters');
        return (await res.json()) as ProductParameter[];
      },
    })),
  });
}
