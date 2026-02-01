"use client";

import React, { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { 
  CatalogRecord, 
  ProductCategory, 
  ProductTag, 
  ProductParameter,
  PriceGroupWithDetails,
  ProductWithImages
} from "@/features/products/types";
import type { Language } from "@/shared/types/internationalization";
import type { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import type { ProductFormData } from "@/features/products/types";

export const productMetadataKeys = {
  catalogs: ["catalogs"] as const,
  categories: (catalogId: string) => ["categories", catalogId] as const,
  tags: (catalogId: string) => ["tags", catalogId] as const,
  parameters: (catalogId: string) => ["parameters", catalogId] as const,
  languages: ["languages"] as const,
  priceGroups: ["price-groups"] as const,
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

export function useLanguages(): UseQueryResult<Language[]> {
  return useQuery({
    queryKey: productMetadataKeys.languages,
    queryFn: async (): Promise<Language[]> => {
      const res = await fetch("/api/languages");
      if (!res.ok) throw new Error("Failed to load languages");
      return (await res.json()) as Language[];
    },
  });
}

export function usePriceGroups(): UseQueryResult<PriceGroupWithDetails[]> {
  return useQuery({
    queryKey: productMetadataKeys.priceGroups,
    queryFn: async (): Promise<PriceGroupWithDetails[]> => {
      const res = await fetch("/api/price-groups");
      if (!res.ok) throw new Error("Failed to load price groups");
      return (await res.json()) as PriceGroupWithDetails[];
    },
  });
}

export interface ProductMetadataHookResult {
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryIds: string[];
  toggleCategory: (categoryId: string) => void;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  parameters: ProductParameter[];
  parametersLoading: boolean;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

export interface UseProductMetadataProps {
  product?: ProductWithImages;
  initialCatalogId?: string;
  initialCatalogIds?: string[];
  initialCategoryIds?: string[];
  initialTagIds?: string[];
  setValue?: UseFormSetValue<ProductFormData>;
  getValues?: UseFormGetValues<ProductFormData>;
}

// Composite hook that combines all metadata functionality
export function useProductMetadata({
  product,
  initialCatalogId,
  initialCatalogIds,
  initialCategoryIds,
  initialTagIds,
}: UseProductMetadataProps): ProductMetadataHookResult {
  const catalogsQuery = useCatalogs();
  const languagesQuery = useLanguages();
  const priceGroupsQuery = usePriceGroups();
  // Initialize selections based on product or initial values
  const initialCatalogSelection = React.useMemo(() => {
    if (product?.catalogs) {
      return product.catalogs.map((c: { catalogId: string }) => c.catalogId);
    }
    if (initialCatalogIds && initialCatalogIds.length > 0) {
      return initialCatalogIds;
    }
    if (initialCatalogId) {
      return [initialCatalogId];
    }
    return [];
  }, [product, initialCatalogIds, initialCatalogId]);

  const initialCategorySelection = React.useMemo(() => {
    if (product?.categories) {
      return product.categories.map((c: { categoryId: string }) => c.categoryId);
    }
    return initialCategoryIds || [];
  }, [product, initialCategoryIds]);

  const initialTagSelection = React.useMemo(() => {
    if (product?.tags) {
      return product.tags.map((t: { tagId: string }) => t.tagId);
    }
    return initialTagIds || [];
  }, [product, initialTagIds]);
  
  const [selectedCatalogIds, setSelectedCatalogIds] = React.useState<string[]>(initialCatalogSelection);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>(initialCategorySelection);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(initialTagSelection);

  const arraysEqual = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  React.useEffect(() => {
    setSelectedCatalogIds((prev) => (arraysEqual(prev, initialCatalogSelection) ? prev : initialCatalogSelection));
  }, [initialCatalogSelection]);

  React.useEffect(() => {
    setSelectedCategoryIds((prev) => (arraysEqual(prev, initialCategorySelection) ? prev : initialCategorySelection));
  }, [initialCategorySelection]);

  React.useEffect(() => {
    setSelectedTagIds((prev) => (arraysEqual(prev, initialTagSelection) ? prev : initialTagSelection));
  }, [initialTagSelection]);
  
  const primaryCatalogId = selectedCatalogIds[0] || "";
  const categoriesQuery = useCategories(primaryCatalogId);
  const tagsQuery = useTags(primaryCatalogId);
  const parametersQuery = useParameters(primaryCatalogId);

  const toggleCatalog = (catalogId: string): void => {
    setSelectedCatalogIds((prev: string[]) => 
      prev.includes(catalogId) 
        ? prev.filter((id: string) => id !== catalogId)
        : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string): void => {
    setSelectedCategoryIds((prev: string[]) => 
      prev.includes(categoryId) 
        ? prev.filter((id: string) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((prev: string[]) => 
      prev.includes(tagId) 
        ? prev.filter((id: string) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Derive filtered languages and price groups based on selected catalogs
  const { filteredLanguages, filteredPriceGroups } = useMemo(() => {
    const catalogs = catalogsQuery.data ?? [];
    const languages = languagesQuery.data ?? [];
    const priceGroups = priceGroupsQuery.data ?? [];

    if (selectedCatalogIds.length === 0) {
      return {
        filteredLanguages: languages,
        filteredPriceGroups: priceGroups,
      };
    }

    const selectedCatalogs = catalogs.filter((catalog) =>
      selectedCatalogIds.includes(catalog.id)
    );
    const languageIdSet = new Set(
      selectedCatalogs.flatMap((catalog) => catalog.languageIds ?? [])
    );
    const normalizedLanguageSet = new Set(
      Array.from(languageIdSet).map((value) => String(value).trim().toUpperCase())
    );

    const filteredLanguages = languageIdSet.size
      ? languages.filter((language) => {
          const idKey = String(language.id).trim().toUpperCase();
          const codeKey = String(language.code).trim().toUpperCase();
          return normalizedLanguageSet.has(idKey) || normalizedLanguageSet.has(codeKey);
        })
      : languages;

    const priceGroupIdSet = new Set(
      selectedCatalogs.flatMap((catalog) => catalog.priceGroupIds ?? [])
    );
    const filteredPriceGroups = priceGroupIdSet.size
      ? priceGroups.filter((group) => priceGroupIdSet.has(group.id))
      : priceGroups;

    return { filteredLanguages, filteredPriceGroups };
  }, [
    catalogsQuery.data,
    languagesQuery.data,
    priceGroupsQuery.data,
    selectedCatalogIds,
  ]);

  return {
    catalogs: catalogsQuery.data || [],
    catalogsLoading: catalogsQuery.isLoading,
    catalogsError: (catalogsQuery.error as Error)?.message || null,
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
    filteredLanguages,
    filteredPriceGroups,
  };
}
