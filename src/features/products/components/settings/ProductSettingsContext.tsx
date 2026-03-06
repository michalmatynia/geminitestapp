'use client';

import React from 'react';

import type {
  Catalog,
  PriceGroup,
  ProductCategoryWithChildren,
  ProductParameter,
  ProductTag,
} from '@/shared/contracts/products';

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
          <ProductSettingsTagsContext.Provider value={tagsValue}>
            <ProductSettingsParametersContext.Provider value={parametersValue}>
              {children}
            </ProductSettingsParametersContext.Provider>
          </ProductSettingsTagsContext.Provider>
        </ProductSettingsCategoriesContext.Provider>
      </ProductSettingsPriceGroupsContext.Provider>
    </ProductSettingsCatalogsContext.Provider>
  );
}

export function useProductSettingsCatalogsContext(): ProductSettingsCatalogsSection {
  const context = React.useContext(ProductSettingsCatalogsContext);
  if (!context) {
    throw new Error(
      'useProductSettingsCatalogsContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsPriceGroupsContext(): ProductSettingsPriceGroupsSection {
  const context = React.useContext(ProductSettingsPriceGroupsContext);
  if (!context) {
    throw new Error(
      'useProductSettingsPriceGroupsContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsCategoriesContext(): ProductSettingsCategoriesSection {
  const context = React.useContext(ProductSettingsCategoriesContext);
  if (!context) {
    throw new Error(
      'useProductSettingsCategoriesContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}

export function useProductSettingsTagsContext(): ProductSettingsTagsSection {
  const context = React.useContext(ProductSettingsTagsContext);
  if (!context) {
    throw new Error('useProductSettingsTagsContext must be used inside ProductSettingsProvider');
  }
  return context;
}

export function useProductSettingsParametersContext(): ProductSettingsParametersSection {
  const context = React.useContext(ProductSettingsParametersContext);
  if (!context) {
    throw new Error(
      'useProductSettingsParametersContext must be used inside ProductSettingsProvider'
    );
  }
  return context;
}
