import type { ProductMetadataHookResult, ProductMetadataResultInput } from './useProductMetadata.types';

const getMetadataErrorMessage = (error: unknown): string | null => {
  if (error === null || error === undefined) return null;
  return error instanceof Error ? error.message : String(error);
};

export const createProductMetadataResult = ({
  catalogs,
  catalogsError,
  catalogsLoading,
  categories,
  categoriesLoading,
  filtered,
  parameters,
  parametersLoading,
  producers,
  producersLoading,
  selection,
  shippingGroups,
  shippingGroupsLoading,
  tags,
  tagsLoading,
}: ProductMetadataResultInput): ProductMetadataHookResult => ({
  catalogs,
  catalogsLoading,
  catalogsError: getMetadataErrorMessage(catalogsError),
  selectedCatalogIds: selection.selectedCatalogIds,
  toggleCatalog: selection.toggleCatalog,
  categories,
  categoriesLoading,
  selectedCategoryId: selection.selectedCategoryId,
  setCategoryId: selection.setCategoryId,
  shippingGroups,
  shippingGroupsLoading,
  tags,
  tagsLoading,
  selectedTagIds: selection.selectedTagIds,
  toggleTag: selection.toggleTag,
  producers,
  producersLoading,
  selectedProducerIds: selection.selectedProducerIds,
  setProducerIds: selection.setProducerIds,
  toggleProducer: selection.toggleProducer,
  parameters,
  parametersLoading,
  filteredLanguages: filtered.filteredLanguages,
  filteredPriceGroups: filtered.filteredPriceGroups,
});
