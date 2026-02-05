
"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import type { Language } from "@/shared/types/internationalization";
import type {
  CatalogRecord,
  PriceGroupWithDetails,
} from "@/features/products/types";
import type {
  ProductCategory,
  ProductTag,
  ProductParameter,
} from "@/features/products/types";

export function useCatalogs(): ReturnType<typeof useQuery<CatalogRecord[], Error, CatalogRecord[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: async () => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to fetch catalogs");
      return (await res.json()) as CatalogRecord[];
    },
  });
}

export function useLanguages(): ReturnType<typeof useQuery<Language[], Error, Language[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const res = await fetch("/api/languages");
      if (!res.ok) throw new Error("Failed to fetch languages");
      return (await res.json()) as Language[];
    },
  });
}

export function usePriceGroups(): ReturnType<typeof useQuery<PriceGroupWithDetails[], Error, PriceGroupWithDetails[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["price-groups"],
    queryFn: async () => {
      const res = await fetch("/api/price-groups");
      if (!res.ok) throw new Error("Failed to fetch price groups");
      return (await res.json()) as PriceGroupWithDetails[];
    },
  });
}

export function useCategories(catalogId?: string): ReturnType<typeof useQuery<ProductCategory[], Error, ProductCategory[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["categories", catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductCategory[];
      const res = await fetch(
        `/api/products/categories?catalogId=${catalogId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch categories");
      return (await res.json()) as ProductCategory[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiCategories(catalogIds: string[]) {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ["categories", catalogId],
      queryFn: async (): Promise<ProductCategory[]> => {
        const res = await fetch(
          `/api/products/categories?catalogId=${catalogId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch categories");
        return (await res.json()) as ProductCategory[];
      },
    })),
  });
}

export function useTags(catalogId?: string): ReturnType<typeof useQuery<ProductTag[], Error, ProductTag[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["tags", catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductTag[];
      const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return (await res.json()) as ProductTag[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiTags(catalogIds: string[]) {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ["tags", catalogId],
      queryFn: async (): Promise<ProductTag[]> => {
        const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
        if (!res.ok) throw new Error("Failed to fetch tags");
        return (await res.json()) as ProductTag[];
      },
    })),
  });
}

export function useParameters(catalogId?: string): ReturnType<typeof useQuery<ProductParameter[], Error, ProductParameter[], (string | undefined)[]>> {
  return useQuery({
    queryKey: ["parameters", catalogId],
    queryFn: async () => {
      if (!catalogId) return [] as ProductParameter[];
      const res = await fetch(
        `/api/products/parameters?catalogId=${catalogId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch parameters");
      return (await res.json()) as ProductParameter[];
    },
    enabled: !!catalogId,
  });
}

export function useMultiParameters(catalogIds: string[]) {
  return useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ["parameters", catalogId],
      queryFn: async (): Promise<ProductParameter[]> => {
        const res = await fetch(
          `/api/products/parameters?catalogId=${catalogId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch parameters");
        return (await res.json()) as ProductParameter[];
      },
    })),
  });
}
