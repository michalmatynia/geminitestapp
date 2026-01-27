"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  ProductWithImages,
  ProductFormData,
} from "@/types";
import { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import { 
  useCatalogs, 
  useLanguages, 
  usePriceGroups, 
  useMultiCategories, 
  useMultiTags, 
  useMultiParameters 
} from "./useMetadata";

interface UseProductMetadataProps {
  product?: ProductWithImages | undefined;
  initialCatalogId?: string | undefined;
  initialCatalogIds?: string[] | undefined;
  initialCategoryIds?: string[] | undefined;
  initialTagIds?: string[] | undefined;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
}

export function useProductMetadata({
  product,
  initialCatalogId: _initialCatalogId,
  initialCatalogIds,
  initialCategoryIds,
  initialTagIds,
  setValue,
  getValues,
}: UseProductMetadataProps) {
  const { data: catalogs = [], isLoading: catalogsLoading, error: catalogsError } = useCatalogs();
  const { data: languages = [] } = useLanguages();
  const { data: priceGroups = [] } = usePriceGroups();
  
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>(
    () =>
      product?.catalogs?.map((entry) => entry.catalogId) ??
      initialCatalogIds ??
      []
  );

  const categoryQueries = useMultiCategories(selectedCatalogIds);
  const tagQueries = useMultiTags(selectedCatalogIds);
  const parameterQueries = useMultiParameters(selectedCatalogIds);

  const categories = useMemo(() => categoryQueries.flatMap(q => q.data ?? []), [categoryQueries]);
  const categoriesLoading = useMemo(() => categoryQueries.some(q => q.isLoading), [categoryQueries]);

  const tags = useMemo(() => tagQueries.flatMap(q => q.data ?? []), [tagQueries]);
  const tagsLoading = useMemo(() => tagQueries.some(q => q.isLoading), [tagQueries]);

  const parameters = useMemo(() => parameterQueries.flatMap(q => q.data ?? []), [parameterQueries]);
  const parametersLoading = useMemo(() => parameterQueries.some(q => q.isLoading), [parameterQueries]);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () =>
      product?.categories?.map((entry: { categoryId: string }) => entry.categoryId) ??
      initialCategoryIds ??
      []
  );

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () =>
      product?.tags?.map((entry: { tagId: string }) => entry.tagId) ??
      initialTagIds ??
      []
  );

  // Auto-select default catalog for new products when none is chosen
  useEffect(() => {
    if (product) return;
    if (selectedCatalogIds.length > 0) return;
    if (catalogs.length === 0) return;
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    const targetId = defaultCatalog?.id ?? catalogs[0]!.id;
    // Use setTimeout to avoid synchronous setState warning in effect
    const timer = setTimeout(() => {
      setSelectedCatalogIds([targetId]);
    }, 0);
    return () => clearTimeout(timer);
  }, [product, selectedCatalogIds.length, catalogs]);

  // Auto-set defaultPriceGroupId when catalog is selected for new products
  useEffect(() => {
    if (product) return; // Only for new products
    if (selectedCatalogIds.length === 0) return;

    // Get the first selected catalog's default price group
    const firstCatalog = catalogs.find((c) => selectedCatalogIds.includes(c.id));
    if (firstCatalog?.defaultPriceGroupId) {
      const currentDefaultPriceGroupId = getValues("defaultPriceGroupId");
      // Only set if not already set
      if (!currentDefaultPriceGroupId) {
        setValue("defaultPriceGroupId", firstCatalog.defaultPriceGroupId);
      }
    }
  }, [product, selectedCatalogIds, catalogs, getValues, setValue]);

  const filteredLanguages = useMemo(() => {
    if (selectedCatalogIds.length === 0) return languages;
    if (catalogsLoading || catalogs.length === 0) return [];

    const selectedCatalogs = catalogs.filter((catalog) => selectedCatalogIds.includes(catalog.id));
    if (selectedCatalogs.length === 0) {
      return languages;
    }

    const allowedLanguageIds = new Set(
      selectedCatalogs.flatMap((catalog) => catalog.languageIds ?? [])
    );

    if (allowedLanguageIds.size === 0) {
      return languages;
    }

    const filtered = languages.filter((language) => allowedLanguageIds.has(language.id));
    return filtered.length > 0 ? filtered : languages;
  }, [languages, catalogs, selectedCatalogIds, catalogsLoading]);

  const filteredPriceGroups = useMemo(() => {
    if (selectedCatalogIds.length === 0) return priceGroups;
    const allowedGroupIds = new Set<string>();
    const orderedGroups: (typeof priceGroups)[number][] = []; 

    // Only include price groups that are explicitly assigned to selected catalogs
    selectedCatalogIds.forEach((catalogId) => {
      const catalog = catalogs.find((c) => c.id === catalogId);
      if (catalog?.priceGroupIds) {
        catalog.priceGroupIds.forEach((pgId) => {
          if (!allowedGroupIds.has(pgId)) {
            const pg = priceGroups.find((p) => p.id === pgId);
            if (pg) {
              orderedGroups.push(pg);
              allowedGroupIds.add(pgId);
            }
          }
        });
      }
    });

    return orderedGroups.length > 0 ? orderedGroups : priceGroups;
  }, [priceGroups, catalogs, selectedCatalogIds]);

  const toggleCatalog = (catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return {
    catalogs,
    catalogsLoading,
    catalogsError: catalogsError ? (catalogsError).message : null,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryIds,
    toggleCategory,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    parameters,
    parametersLoading,
    filteredLanguages,
    filteredPriceGroups,
  };
}