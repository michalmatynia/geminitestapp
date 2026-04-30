'use client';

// useProductMetadata: exposes metadata queries (categories, tags, catalogs,
// producers) used across product forms and lists. These are thin client-side
// adapters over query factories to centralize parsing and caching hints.

import { useFilteredProductMetadata } from './useProductMetadata.filtered';
import { useProductMetadataFormGuard } from './useProductMetadata.guard';
import {
  getPrimaryCatalogId,
  getQueryDataArray,
  isAnyMetadataLoading,
  resolveCategoryTreeCatalogIds,
} from './useProductMetadata.helpers';
import {
  useProductMetadataInitialSelections,
  useProductMetadataSelectionState,
} from './useProductMetadata.selection';
import type { ProductMetadataHookResult, UseProductMetadataProps } from './useProductMetadata.types';
import { createProductMetadataResult } from './useProductMetadata.value';
import {
  useCatalogs,
  useCategoriesForCatalogs,
  useLanguages,
  useParameters,
  usePriceGroups,
  useProducers,
  useShippingGroups,
  useTags,
} from './useProductMetadataQueries';

export type { ProductMetadataHookResult, UseProductMetadataProps };

export {
  productMetadataKeys,
  useCatalogs,
  useCategoriesForCatalogs,
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
export { useCategories } from './useProductMetadataQueries';

export function useProductMetadata(props: UseProductMetadataProps): ProductMetadataHookResult {
  const catalogsQuery = useCatalogs();
  const languagesQuery = useLanguages();
  const priceGroupsQuery = usePriceGroups();
  const producersQuery = useProducers();
  const initialSelections = useProductMetadataInitialSelections(props);
  const selection = useProductMetadataSelectionState(initialSelections);
  const primaryCatalogId = getPrimaryCatalogId(selection.selectedCatalogIds);
  const catalogs = getQueryDataArray(catalogsQuery.data);
  const languages = getQueryDataArray(languagesQuery.data);
  const priceGroups = getQueryDataArray(priceGroupsQuery.data);
  const categoriesQuery = useCategoriesForCatalogs(
    resolveCategoryTreeCatalogIds(catalogs, catalogsQuery.isLoading)
  );
  const shippingGroupsQuery = useShippingGroups(primaryCatalogId);
  const tagsQuery = useTags(primaryCatalogId);
  const parametersQuery = useParameters(primaryCatalogId);
  const filtered = useFilteredProductMetadata({
    catalogs,
    languages,
    priceGroups,
    selectedCatalogIds: selection.selectedCatalogIds,
  });

  useProductMetadataFormGuard({
    catalogs,
    catalogsReady: catalogsQuery.isSuccess,
    filteredLanguages: filtered.filteredLanguages,
    languages,
    languagesReady: languagesQuery.isSuccess,
    product: props.product,
    selectedCatalogIds: selection.selectedCatalogIds,
  });

  return createProductMetadataResult({
    catalogs,
    catalogsError: catalogsQuery.error,
    catalogsLoading: catalogsQuery.isLoading,
    categories: getQueryDataArray(categoriesQuery.data),
    categoriesLoading: isAnyMetadataLoading([catalogsQuery.isLoading, categoriesQuery.isLoading]),
    filtered,
    parameters: getQueryDataArray(parametersQuery.data),
    parametersLoading: parametersQuery.isLoading,
    producers: getQueryDataArray(producersQuery.data),
    producersLoading: producersQuery.isLoading,
    selection,
    shippingGroups: getQueryDataArray(shippingGroupsQuery.data),
    shippingGroupsLoading: shippingGroupsQuery.isLoading,
    tags: getQueryDataArray(tagsQuery.data),
    tagsLoading: tagsQuery.isLoading,
  });
}
