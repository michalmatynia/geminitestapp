'use client';

import React from 'react';

import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import { internalError } from '@/shared/errors/app-error';

type ProductSettingsContextValue = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  onOpenCatalogModal: () => void;
  onEditCatalog: (catalog: Catalog) => void;
  onDeleteCatalog: (catalog: Catalog) => void;
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
  defaultGroupId: string;
  onDefaultGroupChange: (groupId: string) => void;
  defaultGroupSaving: boolean;
  onOpenPriceGroupCreate: () => void;
  onEditPriceGroup: (group: PriceGroup) => void;
  onDeletePriceGroup: (group: PriceGroup) => void;
  loadingCategories: boolean;
  categories: ProductCategoryWithChildren[];
  selectedCategoryCatalogId: string | null;
  onCategoryCatalogChange: (catalogId: string | null) => void;
  onRefreshCategories: () => void;
  loadingShippingGroups: boolean;
  shippingGroups: ProductShippingGroup[];
  selectedShippingGroupCatalogId: string | null;
  onShippingGroupCatalogChange: (catalogId: string | null) => void;
  onRefreshShippingGroups: () => void;
  loadingTags: boolean;
  tags: ProductTag[];
  selectedTagCatalogId: string | null;
  onTagCatalogChange: (catalogId: string | null) => void;
  onRefreshTags: () => void;
  loadingParameters: boolean;
  parameters: ProductParameter[];
  selectedParameterCatalogId: string | null;
  onParameterCatalogChange: (catalogId: string | null) => void;
  onRefreshParameters: () => void;
};

type ProductSettingsCatalogsSection = Pick<
  ProductSettingsContextValue,
  'loadingCatalogs' | 'catalogs' | 'onOpenCatalogModal' | 'onEditCatalog' | 'onDeleteCatalog'
>;

type ProductSettingsPriceGroupsSection = Pick<
  ProductSettingsContextValue,
  | 'loadingGroups'
  | 'priceGroups'
  | 'defaultGroupId'
  | 'onDefaultGroupChange'
  | 'defaultGroupSaving'
  | 'onOpenPriceGroupCreate'
  | 'onEditPriceGroup'
  | 'onDeletePriceGroup'
>;

type ProductSettingsCategoriesSection = Pick<
  ProductSettingsContextValue,
  | 'loadingCategories'
  | 'categories'
  | 'catalogs'
  | 'selectedCategoryCatalogId'
  | 'onCategoryCatalogChange'
  | 'onRefreshCategories'
>;

type ProductSettingsTagsSection = Pick<
  ProductSettingsContextValue,
  | 'loadingTags'
  | 'tags'
  | 'catalogs'
  | 'selectedTagCatalogId'
  | 'onTagCatalogChange'
  | 'onRefreshTags'
>;

type ProductSettingsShippingGroupsSection = Pick<
  ProductSettingsContextValue,
  | 'loadingShippingGroups'
  | 'shippingGroups'
  | 'catalogs'
  | 'selectedShippingGroupCatalogId'
  | 'onShippingGroupCatalogChange'
  | 'onRefreshShippingGroups'
>;

type ProductSettingsParametersSection = Pick<
  ProductSettingsContextValue,
  | 'loadingParameters'
  | 'parameters'
  | 'catalogs'
  | 'selectedParameterCatalogId'
  | 'onParameterCatalogChange'
  | 'onRefreshParameters'
>;

const ProductSettingsCatalogsContext = React.createContext<ProductSettingsCatalogsSection | null>(
  null
);
const ProductSettingsPriceGroupsContext =
  React.createContext<ProductSettingsPriceGroupsSection | null>(null);
const ProductSettingsCategoriesContext =
  React.createContext<ProductSettingsCategoriesSection | null>(null);
const ProductSettingsShippingGroupsContext =
  React.createContext<ProductSettingsShippingGroupsSection | null>(null);
const ProductSettingsTagsContext = React.createContext<ProductSettingsTagsSection | null>(null);
const ProductSettingsParametersContext =
  React.createContext<ProductSettingsParametersSection | null>(null);

export function ProductSettingsProvider({
  value,
  children,
}: {
  value: ProductSettingsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const catalogsValue: ProductSettingsCatalogsSection = {
    loadingCatalogs: value.loadingCatalogs,
    catalogs: value.catalogs,
    onOpenCatalogModal: value.onOpenCatalogModal,
    onEditCatalog: value.onEditCatalog,
    onDeleteCatalog: value.onDeleteCatalog,
  };
  const priceGroupsValue: ProductSettingsPriceGroupsSection = {
    loadingGroups: value.loadingGroups,
    priceGroups: value.priceGroups,
    defaultGroupId: value.defaultGroupId,
    onDefaultGroupChange: value.onDefaultGroupChange,
    defaultGroupSaving: value.defaultGroupSaving,
    onOpenPriceGroupCreate: value.onOpenPriceGroupCreate,
    onEditPriceGroup: value.onEditPriceGroup,
    onDeletePriceGroup: value.onDeletePriceGroup,
  };
  const categoriesValue: ProductSettingsCategoriesSection = {
    loadingCategories: value.loadingCategories,
    categories: value.categories,
    catalogs: value.catalogs,
    selectedCategoryCatalogId: value.selectedCategoryCatalogId,
    onCategoryCatalogChange: value.onCategoryCatalogChange,
    onRefreshCategories: value.onRefreshCategories,
  };
  const tagsValue: ProductSettingsTagsSection = {
    loadingTags: value.loadingTags,
    tags: value.tags,
    catalogs: value.catalogs,
    selectedTagCatalogId: value.selectedTagCatalogId,
    onTagCatalogChange: value.onTagCatalogChange,
    onRefreshTags: value.onRefreshTags,
  };
  const shippingGroupsValue: ProductSettingsShippingGroupsSection = {
    loadingShippingGroups: value.loadingShippingGroups,
    shippingGroups: value.shippingGroups,
    catalogs: value.catalogs,
    selectedShippingGroupCatalogId: value.selectedShippingGroupCatalogId,
    onShippingGroupCatalogChange: value.onShippingGroupCatalogChange,
    onRefreshShippingGroups: value.onRefreshShippingGroups,
  };
  const parametersValue: ProductSettingsParametersSection = {
    loadingParameters: value.loadingParameters,
    parameters: value.parameters,
    catalogs: value.catalogs,
    selectedParameterCatalogId: value.selectedParameterCatalogId,
    onParameterCatalogChange: value.onParameterCatalogChange,
    onRefreshParameters: value.onRefreshParameters,
  };

  return (
    <ProductSettingsCatalogsContext.Provider value={catalogsValue}>
      <ProductSettingsPriceGroupsContext.Provider value={priceGroupsValue}>
        <ProductSettingsCategoriesContext.Provider value={categoriesValue}>
          <ProductSettingsShippingGroupsContext.Provider value={shippingGroupsValue}>
            <ProductSettingsTagsContext.Provider value={tagsValue}>
              <ProductSettingsParametersContext.Provider value={parametersValue}>
                {children}
              </ProductSettingsParametersContext.Provider>
            </ProductSettingsTagsContext.Provider>
          </ProductSettingsShippingGroupsContext.Provider>
        </ProductSettingsCategoriesContext.Provider>
      </ProductSettingsPriceGroupsContext.Provider>
    </ProductSettingsCatalogsContext.Provider>
  );
}

export function useProductSettingsCatalogsContext(): ProductSettingsCatalogsSection {
  const context = React.useContext(ProductSettingsCatalogsContext);
  if (!context) {
    throw internalError(
      'useProductSettingsCatalogsContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsPriceGroupsContext(): ProductSettingsPriceGroupsSection {
  const context = React.useContext(ProductSettingsPriceGroupsContext);
  if (!context) {
    throw internalError(
      'useProductSettingsPriceGroupsContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsCategoriesContext(): ProductSettingsCategoriesSection {
  const context = React.useContext(ProductSettingsCategoriesContext);
  if (!context) {
    throw internalError(
      'useProductSettingsCategoriesContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsTagsContext(): ProductSettingsTagsSection {
  const context = React.useContext(ProductSettingsTagsContext);
  if (!context) {
    throw internalError('useProductSettingsTagsContext must be used inside ProductSettingsProvider');
  }
  return context;
}

export function useProductSettingsShippingGroupsContext(): ProductSettingsShippingGroupsSection {
  const context = React.useContext(ProductSettingsShippingGroupsContext);
  if (!context) {
    throw internalError(
      'useProductSettingsShippingGroupsContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsParametersContext(): ProductSettingsParametersSection {
  const context = React.useContext(ProductSettingsParametersContext);
  if (!context) {
    throw internalError(
      'useProductSettingsParametersContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}
