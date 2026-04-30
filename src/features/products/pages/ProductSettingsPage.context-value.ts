import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';

import type { ProductSettingsActionState } from './ProductSettingsPage.actions';
import type { ProductSettingsCatalogSelectionState } from './ProductSettingsPage.catalog-selection';
import type { ProductSettingsMetadataState } from './ProductSettingsPage.metadata';
import type { ProductSettingsProviderValue } from './ProductSettingsPage.types';

type ProductSettingsContextValueArgs = {
  actions: ProductSettingsActionState;
  metadata: ProductSettingsMetadataState;
  selections: ProductSettingsCatalogSelectionState;
};

type ProductSettingsCatalogContextFields = Pick<
  ProductSettingsProviderValue,
  'loadingCatalogs' | 'catalogs' | 'onOpenCatalogModal' | 'onEditCatalog' | 'onDeleteCatalog'
>;

type ProductSettingsPriceGroupContextFields = Pick<
  ProductSettingsProviderValue,
  | 'loadingGroups'
  | 'priceGroups'
  | 'defaultGroupId'
  | 'onDefaultGroupChange'
  | 'defaultGroupSaving'
  | 'onOpenPriceGroupCreate'
  | 'onEditPriceGroup'
  | 'onDeletePriceGroup'
>;

type ProductSettingsCategoryContextFields = Pick<
  ProductSettingsProviderValue,
  | 'loadingCategories'
  | 'categories'
  | 'selectedCategoryCatalogId'
  | 'onCategoryCatalogChange'
  | 'onRefreshCategories'
>;

type ProductSettingsShippingContextFields = Pick<
  ProductSettingsProviderValue,
  | 'loadingShippingGroups'
  | 'shippingGroups'
  | 'selectedShippingGroupCatalogId'
  | 'onShippingGroupCatalogChange'
  | 'onRefreshShippingGroups'
>;

type ProductSettingsTagContextFields = Pick<
  ProductSettingsProviderValue,
  'loadingTags' | 'tags' | 'selectedTagCatalogId' | 'onTagCatalogChange' | 'onRefreshTags'
>;

type ProductSettingsParameterContextFields = Pick<
  ProductSettingsProviderValue,
  | 'loadingParameters'
  | 'parameters'
  | 'selectedParameterCatalogId'
  | 'onParameterCatalogChange'
  | 'onRefreshParameters'
>;

const buildCatalogContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsCatalogContextFields => ({
  loadingCatalogs: args.metadata.loadingCatalogs,
  catalogs: args.metadata.catalogs,
  onOpenCatalogModal: (): void => {
    args.actions.setEditingCatalog(null);
    args.actions.setShowCatalogModal(true);
  },
  onEditCatalog: (catalog: Catalog): void => {
    args.actions.setEditingCatalog(catalog);
    args.actions.setShowCatalogModal(true);
  },
  onDeleteCatalog: args.actions.handleDeleteCatalog,
});

const buildPriceGroupContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsPriceGroupContextFields => ({
  loadingGroups: args.metadata.loadingGroups,
  priceGroups: args.metadata.priceGroups,
  defaultGroupId: args.actions.defaultGroupId,
  onDefaultGroupChange: (id: string): void => {
    void args.actions.handleSetDefaultGroup(id);
  },
  defaultGroupSaving: args.actions.defaultGroupSaving,
  onOpenPriceGroupCreate: (): void => {
    args.actions.setEditingPriceGroup(null);
    args.actions.setShowPriceGroupModal(true);
  },
  onEditPriceGroup: (group: PriceGroup): void => {
    args.actions.setEditingPriceGroup(group);
    args.actions.setShowPriceGroupModal(true);
  },
  onDeletePriceGroup: args.actions.handleDeleteGroup,
});

const buildCategoryContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsCategoryContextFields => ({
  loadingCategories: args.metadata.loadingCategories,
  categories: args.metadata.productCategories,
  selectedCategoryCatalogId: args.selections.selectedCategoryCatalogId,
  onCategoryCatalogChange: args.selections.setSelectedCategoryCatalogId,
  onRefreshCategories: (): void => {
    void args.metadata.refetchCategories();
  },
});

const buildShippingContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsShippingContextFields => ({
  loadingShippingGroups: args.metadata.loadingShippingGroups,
  shippingGroups: args.metadata.shippingGroups,
  selectedShippingGroupCatalogId: args.selections.selectedShippingGroupCatalogId,
  onShippingGroupCatalogChange: args.selections.setSelectedShippingGroupCatalogId,
  onRefreshShippingGroups: (): void => {
    void args.metadata.refetchShippingGroups();
  },
});

const buildTagContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsTagContextFields => ({
  loadingTags: args.metadata.loadingTags,
  tags: args.metadata.productTags,
  selectedTagCatalogId: args.selections.selectedTagCatalogId,
  onTagCatalogChange: args.selections.setSelectedTagCatalogId,
  onRefreshTags: (): void => {
    void args.metadata.refetchTags();
  },
});

const buildParameterContextFields = (
  args: ProductSettingsContextValueArgs
): ProductSettingsParameterContextFields => ({
  loadingParameters: args.metadata.loadingParameters,
  parameters: args.metadata.productParameters,
  selectedParameterCatalogId: args.selections.selectedParameterCatalogId,
  onParameterCatalogChange: args.selections.setSelectedParameterCatalogId,
  onRefreshParameters: (): void => {
    void args.metadata.refetchParameters();
  },
});

export const buildProductSettingsContextValue = (
  args: ProductSettingsContextValueArgs
): ProductSettingsProviderValue => ({
  ...buildCatalogContextFields(args),
  ...buildPriceGroupContextFields(args),
  ...buildCategoryContextFields(args),
  ...buildShippingContextFields(args),
  ...buildTagContextFields(args),
  ...buildParameterContextFields(args),
});
