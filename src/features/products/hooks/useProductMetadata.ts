'use client';

// useProductMetadata: exposes metadata queries (categories, tags, catalogs,
// producers) used across product forms and lists. These are thin client-side
// adapters over query factories to centralize parsing and caching hints.

import React, { useMemo, useEffect } from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { PriceGroupWithDetails, ProductWithImages } from '@/shared/contracts/products/product';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import { api } from '@/shared/lib/api-client';
import { matchesPriceGroupIdentifier } from '@/shared/lib/products/utils/price-group-identifiers';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { isEditingProductHydrated } from './editingProductHydration';
import {
  useCatalogs,
  useCategories,
  useLanguages,
  useParameters,
  usePriceGroups,
  useProducers,
  useShippingGroups,
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
  useDeleteTitleTermMutation,
  useSaveTitleTermMutation,
  useShippingGroups,
  useTags,
  useTitleTerms,
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
  shippingGroups: ProductShippingGroup[];
  shippingGroupsLoading: boolean;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  setProducerIds: (producerIds: string[]) => void;
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

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeSelectionIds = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const normalizedValue = toTrimmedString(value);
    if (!normalizedValue) continue;
    unique.add(normalizedValue);
  }
  return Array.from(unique);
};

const normalizeCatalogIdList = (values: ReadonlyArray<unknown>): string[] => {
  const resolveCatalogId = (value: unknown): string => {
    if (typeof value === 'string') {
      return toTrimmedString(value);
    }
    if (value === null || value === undefined || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    const direct =
      toTrimmedString(record['catalogId']) ||
      toTrimmedString(record['catalog_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    if (direct !== '') return direct;

    const nestedCatalog = record['catalog'];
    if (nestedCatalog === null || nestedCatalog === undefined || typeof nestedCatalog !== 'object') return '';
    const nestedRecord = nestedCatalog as Record<string, unknown>;
    const nestedId = toTrimmedString(nestedRecord['id']) ||
      toTrimmedString(nestedRecord['catalogId']) ||
      toTrimmedString(nestedRecord['catalog_id']);
    return nestedId;
  };

  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = resolveCatalogId(value);
    if (trimmed === '') continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

const resolveCategoryIdFromProduct = (product?: ProductWithImages): string | null => {
  if (product === undefined || product === null) return null;
  const direct = toTrimmedString(product.categoryId);
  if (direct !== '') return direct;
  return null;
};

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
  const initialCatalogSelection = React.useMemo((): string[] => {
    if (product !== undefined && product !== null) {
      const productCatalogIds = Array.isArray(product.catalogs)
        ? normalizeCatalogIdList(product.catalogs)
        : [];
      if (productCatalogIds.length > 0) {
        return productCatalogIds;
      }
      const fallbackCatalogId =
        typeof product.catalogId === 'string' ? product.catalogId.trim() : '';
      if (fallbackCatalogId !== '') {
        return [fallbackCatalogId];
      }
    }
    const normalizedInitialCatalogIds = normalizeCatalogIdList(initialCatalogIds ?? []);
    if (normalizedInitialCatalogIds.length > 0) {
      return normalizedInitialCatalogIds;
    }
    const fallbackInitialCatalogId =
      typeof initialCatalogId === 'string' ? initialCatalogId.trim() : '';
    if (fallbackInitialCatalogId !== '') {
      return [fallbackInitialCatalogId];
    }
    return [];
  }, [product, initialCatalogIds, initialCatalogId]);

  const initialCategorySelection = React.useMemo((): string | null => {
    const resolvedProductCategoryId = resolveCategoryIdFromProduct(product);
    if (resolvedProductCategoryId !== null) {
      return resolvedProductCategoryId;
    }
    if (initialCategoryId !== null && initialCategoryId !== undefined && initialCategoryId !== '') {
      return initialCategoryId;
    }
    return null;
  }, [product, initialCategoryId]);

  const initialTagSelection = React.useMemo((): string[] => {
    if (product?.tags !== undefined && product.tags !== null) {
      return product.tags.map((t: { tagId: string }) => t.tagId);
    }
    return initialTagIds ?? [];
  }, [product, initialTagIds]);

  const initialProducerSelection = React.useMemo((): string[] => {
    if (product?.producers !== undefined && product.producers !== null) {
      return normalizeSelectionIds(
        product.producers.map((p: { producerId: string }) => p.producerId)
      );
    }
    if (initialProducerIds !== undefined && initialProducerIds !== null && initialProducerIds.length > 0) {
      return normalizeSelectionIds(initialProducerIds);
    }
    return [];
  }, [product, initialProducerIds]);

  const [selectedCatalogIds, setSelectedCatalogIds] =
    React.useState<string[]>(initialCatalogSelection);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(
    initialCategorySelection
  );
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(initialTagSelection);
  const [selectedProducerIds, setSelectedProducerIds] =
    React.useState<string[]>(initialProducerSelection);

  const arraysEqual = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((value: string, index: number) => value === b[index]);

  React.useEffect(() => {
    setSelectedCatalogIds((prev: string[]) =>
      arraysEqual(prev, initialCatalogSelection) ? prev : initialCatalogSelection
    );
  }, [initialCatalogSelection]);

  React.useEffect(() => {
    setSelectedCategoryId((prev: string | null) =>
      prev === initialCategorySelection ? prev : initialCategorySelection
    );
  }, [initialCategorySelection]);

  React.useEffect(() => {
    setSelectedTagIds((prev: string[]) =>
      arraysEqual(prev, initialTagSelection) ? prev : initialTagSelection
    );
  }, [initialTagSelection]);

  React.useEffect(() => {
    setSelectedProducerIds((prev: string[]) =>
      arraysEqual(prev, initialProducerSelection) ? prev : initialProducerSelection
    );
  }, [initialProducerSelection]);

  const primaryCatalogId = selectedCatalogIds[0] ?? '';
  const categoriesQuery = useCategories(primaryCatalogId);
  const shippingGroupsQuery = useShippingGroups(primaryCatalogId);
  const tagsQuery = useTags(primaryCatalogId);
  const parametersQuery = useParameters(primaryCatalogId);
  const categories = categoriesQuery.data ?? [];
  const isSelectedCategoryInPrimaryCatalog = React.useMemo((): boolean => {
    if (selectedCategoryId === null) return true;
    return categories.some((category: ProductCategory) => category.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);
  const attemptedCategoryCatalogResolutionsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    attemptedCategoryCatalogResolutionsRef.current.clear();
  }, [initialCategorySelection, product?.id]);

  React.useEffect(() => {
    if ((product?.id ?? null) === null) return;
    if (selectedCategoryId === null) return;
    if (selectedCategoryId !== initialCategorySelection) return;
    if (arraysEqual(selectedCatalogIds, initialCatalogSelection) === false) return;
    if (categoriesQuery.isLoading === true) return;
    if (isSelectedCategoryInPrimaryCatalog === true) return;

    const resolutionKey = `${selectedCategoryId}:${primaryCatalogId !== '' ? primaryCatalogId : 'none'}`;
    if (attemptedCategoryCatalogResolutionsRef.current.has(resolutionKey)) return;
    attemptedCategoryCatalogResolutionsRef.current.add(resolutionKey);

    let cancelled = false;
    void api
      .get<ProductCategory>(
        `/api/v2/products/categories/${encodeURIComponent(selectedCategoryId)}`,
        {
          logError: false,
        }
      )
      .then((category: ProductCategory) => {
        if (cancelled === true) return;
        const categoryCatalogId =
          typeof category?.catalogId === 'string' ? category.catalogId.trim() : '';
        if (categoryCatalogId === '') return;
        setSelectedCatalogIds((prev: string[]) => {
          if (prev[0] === categoryCatalogId) return prev;
          const withoutCurrent = prev.filter((id: string) => id !== categoryCatalogId);
          return [categoryCatalogId, ...withoutCurrent];
        });
      })
      .catch(() => {
        // Best effort fallback only.
      });

    return () => {
      cancelled = true;
    };
  }, [
    categoriesQuery.isLoading,
    initialCatalogSelection,
    initialCategorySelection,
    isSelectedCategoryInPrimaryCatalog,
    primaryCatalogId,
    product?.id,
    selectedCategoryId,
    selectedCatalogIds,
  ]);

  const toggleCatalog = (catalogId: string): void => {
    setSelectedCatalogIds((prev: string[]) =>
      prev.includes(catalogId)
        ? prev.filter((id: string) => id !== catalogId)
        : [...prev, catalogId]
    );
  };

  const setCategoryId = (categoryId: string | null): void => {
    const trimmed = typeof categoryId === 'string' ? categoryId.trim() : '';
    setSelectedCategoryId(trimmed !== '' ? trimmed : null);
  };

  const toggleTag = (tagId: string): void => {
    setSelectedTagIds((prev: string[]) =>
      prev.includes(tagId) ? prev.filter((id: string) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleProducer = (producerId: string): void => {
    setSelectedProducerIds((prev: string[]) =>
      prev.includes(producerId)
        ? prev.filter((id: string) => id !== producerId)
        : [...prev, producerId]
    );
  };

  const setProducerIds = (producerIds: string[]): void => {
    setSelectedProducerIds((prev: string[]) => {
      const nextIds = normalizeSelectionIds(producerIds);
      return arraysEqual(prev, nextIds) ? prev : nextIds;
    });
  };

  // Derive filtered languages and price groups based on selected catalogs
  const filteredResult = useMemo(() => {
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

    const languagesResult = languageIdSet.size > 0
      ? languages.filter((language: Language) => {
        const idKey = String(language.id).trim().toUpperCase();
        const codeKey = String(language.code).trim().toUpperCase();
        return normalizedLanguageSet.has(idKey) || normalizedLanguageSet.has(codeKey);
      })
      : languages;

    const priceGroupIdSet = new Set(
      selectedCatalogs.flatMap((catalog: CatalogRecord) => catalog.priceGroupIds ?? [])
    );
    const priceGroupsResult = priceGroupIdSet.size > 0
      ? priceGroups.filter((group: PriceGroupWithDetails) =>
        Array.from(priceGroupIdSet).some((identifier) =>
          matchesPriceGroupIdentifier(group, identifier)
        )
      )
      : priceGroups;

    return { filteredLanguages: languagesResult, filteredPriceGroups: priceGroupsResult };
  }, [catalogsQuery.data, languagesQuery.data, priceGroupsQuery.data, selectedCatalogIds]);

  const { filteredLanguages, filteredPriceGroups } = filteredResult;

  // Guard: detect "form fields invisible" failure condition.
  // Fires only AFTER both catalog and language queries succeed — never during loading.
  useEffect(() => {
    if ((product?.id ?? null) === null) return;
    if (catalogsQuery.isSuccess === false || languagesQuery.isSuccess === false) return;
    if (selectedCatalogIds.length === 0) return;
    if (filteredLanguages.length > 0) return;
    logClientError(new Error('[ProductForm] filteredLanguages empty after queries resolved'), {
      context: {
        service: 'products',
        category: 'form-guard',
        productId: product!.id,
        isHydrated: isEditingProductHydrated(product),
        selectedCatalogIds,
        catalogsCount: catalogsQuery.data?.length ?? 0,
        languagesCount: languagesQuery.data?.length ?? 0,
      },
    });
  }, [
    product,
    catalogsQuery.isSuccess,
    catalogsQuery.data,
    languagesQuery.isSuccess,
    languagesQuery.data,
    selectedCatalogIds,
    filteredLanguages,
  ]);

  return {
    catalogs: catalogsQuery.data ?? [],
    catalogsLoading: catalogsQuery.isLoading,
    catalogsError: ((catalogsQuery.error ?? null) !== null) ? (catalogsQuery.error as Error).message : null,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading: categoriesQuery.isLoading,
    selectedCategoryId,
    setCategoryId,
    shippingGroups: shippingGroupsQuery.data ?? [],
    shippingGroupsLoading: shippingGroupsQuery.isLoading,
    tags: tagsQuery.data ?? [],
    tagsLoading: tagsQuery.isLoading,
    selectedTagIds,
    toggleTag,
    producers: producersQuery.data ?? [],
    producersLoading: producersQuery.isLoading,
    selectedProducerIds,
    setProducerIds,
    toggleProducer,
    parameters: parametersQuery.data ?? [],
    parametersLoading: parametersQuery.isLoading,
    filteredLanguages,
    filteredPriceGroups,
  };
}
