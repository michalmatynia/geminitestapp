"use client";

import React from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { 
  CatalogRecord, 
  ProductCategory, 
  ProductTag, 
  ProductParameter 
} from "@/features/products/types";

export const productMetadataKeys = {
  catalogs: ["catalogs"] as const,
  categories: (catalogId: string) => ["categories", catalogId] as const,
  tags: (catalogId: string) => ["tags", catalogId] as const,
  parameters: (catalogId: string) => ["parameters", catalogId] as const,
};

export function useCatalogs(): UseQueryResult<CatalogRecord[]> {
  return useQuery({
    queryKey: productMetadataKeys.catalogs,
    queryFn: async (): Promise<CatalogRecord[]> => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to load catalogs");
      return (await res.json()) as CatalogRecord[];
    },
  });
}

export function useCategories(catalogId: string): UseQueryResult<ProductCategory[]> {
  return useQuery({
    queryKey: productMetadataKeys.categories(catalogId),
    queryFn: async (): Promise<ProductCategory[]> => {
      const res = await fetch(`/api/products/categories?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to load categories");
      return (await res.json()) as ProductCategory[];
    },
    enabled: !!catalogId,
  });
}

export function useTags(catalogId: string): UseQueryResult<ProductTag[]> {
  return useQuery({
    queryKey: productMetadataKeys.tags(catalogId),
    queryFn: async (): Promise<ProductTag[]> => {
      const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to load tags");
      return (await res.json()) as ProductTag[];
    },
    enabled: !!catalogId,
  });
}

export function useParameters(catalogId: string): UseQueryResult<ProductParameter[]> {
  return useQuery({
    queryKey: productMetadataKeys.parameters(catalogId),
    queryFn: async (): Promise<ProductParameter[]> => {
      const res = await fetch(`/api/products/parameters?catalogId=${catalogId}`);
      if (!res.ok) throw new Error("Failed to load parameters");
      return (await res.json()) as ProductParameter[];
    },
    enabled: !!catalogId,
  });
}
// Composite hook that combines all metadata functionality
export function useProductMetadata({
  initialCatalogId,
}: {
  initialCatalogId?: string;
  // Other props ignored for now to fix tsc errors
  [key: string]: any;
}) {
  const catalogsQuery = useCatalogs();
  const [selectedCatalogIds, setSelectedCatalogIds] = React.useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  
  const primaryCatalogId = selectedCatalogIds[0] || initialCatalogId || "";
  const categoriesQuery = useCategories(primaryCatalogId);
  const tagsQuery = useTags(primaryCatalogId);
  const parametersQuery = useParameters(primaryCatalogId);

  const toggleCatalog = (catalogId: string) => {
    setSelectedCatalogIds(prev => 
      prev.includes(catalogId) 
        ? prev.filter(id => id !== catalogId)
        : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return {
    catalogs: catalogsQuery.data || [],
    catalogsLoading: catalogsQuery.isLoading,
    catalogsError: catalogsQuery.error?.message || null,
    selectedCatalogIds,
    toggleCatalog,
    categories: categoriesQuery.data || [],
    categoriesLoading: categoriesQuery.isLoading,
    selectedCategoryIds,
    toggleCategory,
    tags: tagsQuery.data || [],
    tagsLoading: tagsQuery.isLoading,
    selectedTagIds,
    toggleTag,
    parameters: parametersQuery.data || [],
    parametersLoading: parametersQuery.isLoading,
    filteredLanguages: [], // Placeholder
    filteredPriceGroups: [], // Placeholder
  };
}