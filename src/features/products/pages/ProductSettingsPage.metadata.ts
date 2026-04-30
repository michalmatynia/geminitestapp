'use client';

import {
  useCatalogs,
  useCategories,
  useCustomFields,
  useParameters,
  usePriceGroups,
  useShippingGroups,
  useTags,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';

import type { ProductSettingsCatalogSelectionState } from './ProductSettingsPage.catalog-selection';
import type {
  ProductSettingsCustomFieldsProps,
  ProductSettingsParametersProps,
} from './ProductSettingsPage.types';

type ProductSettingsMetadataArgs = {
  selections: ProductSettingsCatalogSelectionState;
  shouldLoadCatalogs: boolean;
  shouldLoadPriceGroups: boolean;
  isCategoriesSectionActive: boolean;
  isShippingGroupsSectionActive: boolean;
  isTagsSectionActive: boolean;
  isCustomFieldsSectionActive: boolean;
  isParametersSectionActive: boolean;
};

type ProductSettingsBaseMetadata = {
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  catalogs: Catalog[];
  loadingCatalogs: boolean;
};

type ProductSettingsCatalogMetadata = {
  productCategories: ProductCategoryWithChildren[];
  loadingCategories: boolean;
  refetchCategories: () => unknown;
  shippingGroups: ProductShippingGroup[];
  loadingShippingGroups: boolean;
  refetchShippingGroups: () => unknown;
  productTags: ProductTag[];
  loadingTags: boolean;
  refetchTags: () => unknown;
  productParameters: ProductParameter[];
  loadingParameters: boolean;
  refetchParameters: () => unknown;
};

type ProductSettingsCustomFieldMetadata = {
  productCustomFields: ProductCustomFieldDefinition[];
  loadingCustomFields: boolean;
  refetchCustomFields: () => unknown;
};

type ProductSettingsRawMetadata = ProductSettingsBaseMetadata &
  ProductSettingsCatalogMetadata &
  ProductSettingsCustomFieldMetadata;

export type ProductSettingsMetadataState = ProductSettingsRawMetadata & {
  customFieldsProps: ProductSettingsCustomFieldsProps;
  parametersProps: ProductSettingsParametersProps;
};

type ProductSettingsParametersPropsSource = ProductSettingsBaseMetadata &
  ProductSettingsCatalogMetadata &
  ProductSettingsCustomFieldMetadata;

const useProductSettingsBaseMetadata = (
  args: Pick<ProductSettingsMetadataArgs, 'shouldLoadCatalogs' | 'shouldLoadPriceGroups'>
): ProductSettingsBaseMetadata => {
  const { data: priceGroups = [], isLoading: loadingGroups } = usePriceGroups({
    enabled: args.shouldLoadPriceGroups,
  });
  const { data: catalogs = [], isLoading: loadingCatalogs } = useCatalogs({
    enabled: args.shouldLoadCatalogs,
  });

  return { priceGroups, loadingGroups, catalogs, loadingCatalogs };
};

const useProductSettingsCatalogMetadata = (
  args: ProductSettingsMetadataArgs
): ProductSettingsCatalogMetadata => {
  const categoriesQuery = useCategories(args.selections.selectedCategoryCatalogId, {
    enabled: args.isCategoriesSectionActive,
  });
  const shippingGroupsQuery = useShippingGroups(args.selections.selectedShippingGroupCatalogId, {
    enabled: args.isShippingGroupsSectionActive,
  });
  const tagsQuery = useTags(args.selections.selectedTagCatalogId, {
    enabled: args.isTagsSectionActive,
  });
  const parametersQuery = useParameters(args.selections.selectedParameterCatalogId, {
    enabled: args.isParametersSectionActive,
  });

  return {
    productCategories: categoriesQuery.data ?? [],
    loadingCategories: categoriesQuery.isLoading,
    refetchCategories: categoriesQuery.refetch,
    shippingGroups: shippingGroupsQuery.data ?? [],
    loadingShippingGroups: shippingGroupsQuery.isLoading,
    refetchShippingGroups: shippingGroupsQuery.refetch,
    productTags: tagsQuery.data ?? [],
    loadingTags: tagsQuery.isLoading,
    refetchTags: tagsQuery.refetch,
    productParameters: parametersQuery.data ?? [],
    loadingParameters: parametersQuery.isLoading,
    refetchParameters: parametersQuery.refetch,
  };
};

const useProductSettingsCustomFieldMetadata = (
  args: Pick<ProductSettingsMetadataArgs, 'isCustomFieldsSectionActive'>
): ProductSettingsCustomFieldMetadata => {
  const customFieldsQuery = useCustomFields({ enabled: args.isCustomFieldsSectionActive });
  return {
    productCustomFields: customFieldsQuery.data ?? [],
    loadingCustomFields: customFieldsQuery.isLoading,
    refetchCustomFields: customFieldsQuery.refetch,
  };
};

const buildCustomFieldsProps = (
  metadata: ProductSettingsCustomFieldMetadata
): ProductSettingsCustomFieldsProps => ({
  loading: metadata.loadingCustomFields,
  customFields: metadata.productCustomFields,
  onRefresh: (): void => {
    void metadata.refetchCustomFields();
  },
});

const buildParametersProps = (
  args: ProductSettingsParametersPropsSource,
  selections: ProductSettingsCatalogSelectionState
): ProductSettingsParametersProps => ({
  loading: args.loadingParameters,
  parameters: args.productParameters,
  catalogs: args.catalogs,
  selectedCatalogId: selections.selectedParameterCatalogId,
  onCatalogChange: (catalogId: string): void => {
    selections.setSelectedParameterCatalogId(catalogId);
  },
  onRefresh: (): void => {
    void args.refetchParameters();
  },
});

export const useProductSettingsMetadata = (
  args: ProductSettingsMetadataArgs
): ProductSettingsMetadataState => {
  const baseMetadata = useProductSettingsBaseMetadata(args);
  const catalogMetadata = useProductSettingsCatalogMetadata(args);
  const customFieldMetadata = useProductSettingsCustomFieldMetadata(args);
  const metadata = { ...baseMetadata, ...catalogMetadata, ...customFieldMetadata };

  return {
    ...metadata,
    customFieldsProps: buildCustomFieldsProps(customFieldMetadata),
    parametersProps: buildParametersProps(metadata, args.selections),
  };
};
