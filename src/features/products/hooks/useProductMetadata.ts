'use client';

import React, { useMemo } from 'react';

import type {
  CatalogRecord,
  ProductCategory,
  ProductTag,
  ProductParameter,
  PriceGroupWithDetails,
  ProductWithImages,
  Producer,
} from '@/features/products/types';
import type { ProductFormData } from '@/features/products/types';
import type { Language } from '@/shared/types/domain/internationalization';

import {
  useCatalogs,
  useCategories,
  useLanguages,
  useParameters,
  usePriceGroups,
  useProducers,
  useTags,
} from './useProductMetadataQueries';

import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

export {
  productMetadataKeys,
  useCatalogs,
  useCategories,
  useDeleteProducerMutation,
  useLanguages,
  useParameters,
  usePriceGroups,
  useProducers,
  useSaveProducerMutation,
  useTags,
} from './useProductMetadataQueries';

export interface ProductMetadataHookResult {
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  toggleProducer: (producerId: string) => void;
  parameters: ProductParameter[];
  parametersLoading: boolean;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

export interface UseProductMetadataProps {
  product?: ProductWithImages | undefined;
  initialCatalogId?: string | undefined;
  initialCatalogIds?: string[] | undefined;
  initialCategoryId?: string | null | undefined;
  initialTagIds?: string[] | undefined;
  initialProducerIds?: string[] | undefined;
  setValue?: UseFormSetValue<ProductFormData> | undefined;
  getValues?: UseFormGetValues<ProductFormData> | undefined;
}

// Composite hook that combines all metadata functionality
export function useProductMetadata({
  product,
  initialCatalogId,
  initialCatalogIds,
  initialCategoryId,
  initialTagIds,
  initialProducerIds,
}: UseProductMetadataProps): ProductMetadataHookResult {
  const catalogsQuery = useCatalogs();
  const languagesQuery = useLanguages();
  const priceGroupsQuery = usePriceGroups();
  const producersQuery = useProducers();
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
    if (product?.categoryId) {
      return product.categoryId;
    }
    if (initialCategoryId) {
      return initialCategoryId;
    }
    return null;
  }, [product, initialCategoryId]);

  const initialTagSelection = React.useMemo(() => {
    if (product?.tags) {
      return product.tags.map((t: { tagId: string }) => t.tagId);
    }
    return initialTagIds || [];
  }, [product, initialTagIds]);

  const initialProducerSelection = React.useMemo(() => {
    if (product?.producers) {
      return product.producers.map((p: { producerId: string }) => p.producerId);
    }
    if (initialProducerIds && initialProducerIds.length > 0) {
      return initialProducerIds;
    }
    return [];
  }, [product, initialProducerIds]);
  
  const [selectedCatalogIds, setSelectedCatalogIds] = React.useState<string[]>(initialCatalogSelection);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(initialCategorySelection);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(initialTagSelection);
  const [selectedProducerIds, setSelectedProducerIds] = React.useState<string[]>(initialProducerSelection);

  const arraysEqual = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((value: string, index: number) => value === b[index]);

  React.useEffect(() => {
    setSelectedCatalogIds((prev: string[]) => (arraysEqual(prev, initialCatalogSelection) ? prev : initialCatalogSelection));
  }, [initialCatalogSelection]);

  React.useEffect(() => {
    setSelectedCategoryId((prev: string | null) => (prev === initialCategorySelection ? prev : initialCategorySelection));
  }, [initialCategorySelection]);

  React.useEffect(() => {
    setSelectedTagIds((prev: string[]) => (arraysEqual(prev, initialTagSelection) ? prev : initialTagSelection));
  }, [initialTagSelection]);

  React.useEffect(() => {
    setSelectedProducerIds((prev: string[]) =>
      arraysEqual(prev, initialProducerSelection) ? prev : initialProducerSelection
    );
  }, [initialProducerSelection]);
  
  const primaryCatalogId = selectedCatalogIds[0] || '';
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

  const setCategoryId = (categoryId: string | null): void => {
    const trimmed = typeof categoryId === 'string' ? categoryId.trim() : '';
    setSelectedCategoryId(trimmed ? trimmed : null);
  };

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((prev: string[]) => 
      prev.includes(tagId) 
        ? prev.filter((id: string) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleProducer = (producerId: string): void => {
    setSelectedProducerIds((prev: string[]) =>
      prev.includes(producerId)
        ? prev.filter((id: string) => id !== producerId)
        : [...prev, producerId]
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

    const selectedCatalogs = catalogs.filter((catalog: CatalogRecord) =>
      selectedCatalogIds.includes(catalog.id)
    );
    const languageIdSet = new Set(
      selectedCatalogs.flatMap((catalog: CatalogRecord) => catalog.languageIds ?? [])
    );
    const normalizedLanguageSet = new Set(
      Array.from(languageIdSet).map((value: string) => String(value).trim().toUpperCase())
    );

    const filteredLanguages = languageIdSet.size
      ? languages.filter((language: Language) => {
        const idKey = String(language.id).trim().toUpperCase();
        const codeKey = String(language.code).trim().toUpperCase();
        return normalizedLanguageSet.has(idKey) || normalizedLanguageSet.has(codeKey);
      })
      : languages;

    const priceGroupIdSet = new Set(
      selectedCatalogs.flatMap((catalog: CatalogRecord) => catalog.priceGroupIds ?? [])
    );
    const filteredPriceGroups = priceGroupIdSet.size
      ? priceGroups.filter((group: PriceGroupWithDetails) => priceGroupIdSet.has(group.id))
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
    selectedCategoryId,
    setCategoryId,
    tags: tagsQuery.data || [],
    tagsLoading: tagsQuery.isLoading,
    selectedTagIds,
    toggleTag,
    producers: producersQuery.data || [],
    producersLoading: producersQuery.isLoading,
    selectedProducerIds,
    toggleProducer,
    parameters: parametersQuery.data || [],
    parametersLoading: parametersQuery.isLoading,
    filteredLanguages,
    filteredPriceGroups,
  };
}
