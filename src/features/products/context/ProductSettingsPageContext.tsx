'use client';

import { createContext, useContext } from 'react';

import type {
  Catalog,
  PriceGroup,
  ProductCategoryWithChildren,
  ProductTag,
} from '@/features/products/types';
import { internalError } from '@/shared/errors/app-error';

export type ProductSettingsCategoriesSection = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

export type ProductSettingsTagsSection = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

export type ProductSettingsPriceGroupsSection = {
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
  defaultGroupId: string;
  onDefaultGroupChange: (groupId: string) => void;
  defaultGroupSaving: boolean;
  handleOpenCreate: () => void;
  handleEditGroup: (group: PriceGroup) => void;
  handleDeleteGroup: (group: PriceGroup) => void;
};

export type ProductSettingsCatalogsSection = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};

export type ProductSettingsCatalogModalSection = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog: Catalog | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
};

export type ProductSettingsPriceGroupModalSection = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup: PriceGroup | null;
  priceGroups: PriceGroup[];
};

type ProductSettingsPageContextValue = {
  categories: ProductSettingsCategoriesSection;
  tags: ProductSettingsTagsSection;
  priceGroups: ProductSettingsPriceGroupsSection;
  catalogs: ProductSettingsCatalogsSection;
  catalogModal: ProductSettingsCatalogModalSection;
  priceGroupModal: ProductSettingsPriceGroupModalSection;
};

const ProductSettingsPageContext = createContext<ProductSettingsPageContextValue | null>(null);

export function ProductSettingsPageProvider({
  value,
  children,
}: {
  value: ProductSettingsPageContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ProductSettingsPageContext.Provider value={value}>
      {children}
    </ProductSettingsPageContext.Provider>
  );
}

function useProductSettingsPageContext(): ProductSettingsPageContextValue {
  const context = useContext(ProductSettingsPageContext);
  if (!context) {
    throw internalError(
      'useProductSettingsPageContext must be used within ProductSettingsPageProvider'
    );
  }
  return context;
}

export function useProductSettingsCategoriesSection(): ProductSettingsCategoriesSection {
  return useProductSettingsPageContext().categories;
}

export function useProductSettingsTagsSection(): ProductSettingsTagsSection {
  return useProductSettingsPageContext().tags;
}

export function useProductSettingsPriceGroupsSection(): ProductSettingsPriceGroupsSection {
  return useProductSettingsPageContext().priceGroups;
}

export function useProductSettingsCatalogsSection(): ProductSettingsCatalogsSection {
  return useProductSettingsPageContext().catalogs;
}

export function useProductSettingsCatalogModalSection(): ProductSettingsCatalogModalSection {
  return useProductSettingsPageContext().catalogModal;
}

export function useProductSettingsPriceGroupModalSection(): ProductSettingsPriceGroupModalSection {
  return useProductSettingsPageContext().priceGroupModal;
}
