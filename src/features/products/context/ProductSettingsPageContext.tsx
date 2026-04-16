'use client';

// ProductSettingsPageContext: provides shared state for product settings
// pages (catalogs, tags, price groups). Centralizes temporary edit state,
// save/rollback helpers, and cross-panel notifications so individual panels
// can remain focused.

import { createContext, useContext } from 'react';

import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ProductTag } from '@/shared/contracts/products/tags';
import { internalError } from '@/shared/errors/app-error';

// --- Granular Contexts ---

export type ProductSettingsCategoriesSection = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};
const CategoriesContext = createContext<ProductSettingsCategoriesSection | null>(null);
export const useProductSettingsCategoriesSection = () => {
  const context = useContext(CategoriesContext);
  if (!context)
    throw internalError(
      'useProductSettingsCategoriesSection must be used within ProductSettingsPageProvider'
    );
  return context;
};

export type ProductSettingsTagsSection = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};
const TagsContext = createContext<ProductSettingsTagsSection | null>(null);
export const useProductSettingsTagsSection = () => {
  const context = useContext(TagsContext);
  if (!context)
    throw internalError(
      'useProductSettingsTagsSection must be used within ProductSettingsPageProvider'
    );
  return context;
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
const PriceGroupsContext = createContext<ProductSettingsPriceGroupsSection | null>(null);
export const useProductSettingsPriceGroupsSection = () => {
  const context = useContext(PriceGroupsContext);
  if (!context)
    throw internalError(
      'useProductSettingsPriceGroupsSection must be used within ProductSettingsPageProvider'
    );
  return context;
};

export type ProductSettingsCatalogsSection = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};
const CatalogsContext = createContext<ProductSettingsCatalogsSection | null>(null);
export const useProductSettingsCatalogsSection = () => {
  const context = useContext(CatalogsContext);
  if (!context)
    throw internalError(
      'useProductSettingsCatalogsSection must be used within ProductSettingsPageProvider'
    );
  return context;
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
const CatalogModalContext = createContext<ProductSettingsCatalogModalSection | null>(null);
export const useProductSettingsCatalogModalSection = () => {
  const context = useContext(CatalogModalContext);
  if (!context)
    throw internalError(
      'useProductSettingsCatalogModalSection must be used within ProductSettingsPageProvider'
    );
  return context;
};

export type ProductSettingsPriceGroupModalSection = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup: PriceGroup | null;
  priceGroups: PriceGroup[];
};
const PriceGroupModalContext = createContext<ProductSettingsPriceGroupModalSection | null>(null);
export const useProductSettingsPriceGroupModalSection = () => {
  const context = useContext(PriceGroupModalContext);
  if (!context)
    throw internalError(
      'useProductSettingsPriceGroupModalSection must be used within ProductSettingsPageProvider'
    );
  return context;
};

type ProductSettingsPageContextValue = {
  categories: ProductSettingsCategoriesSection;
  tags: ProductSettingsTagsSection;
  priceGroups: ProductSettingsPriceGroupsSection;
  catalogs: ProductSettingsCatalogsSection;
  catalogModal: ProductSettingsCatalogModalSection;
  priceGroupModal: ProductSettingsPriceGroupModalSection;
};

export function ProductSettingsPageProvider({
  value,
  children,
}: {
  value: ProductSettingsPageContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CategoriesContext.Provider value={value.categories}>
      <TagsContext.Provider value={value.tags}>
        <PriceGroupsContext.Provider value={value.priceGroups}>
          <CatalogsContext.Provider value={value.catalogs}>
            <CatalogModalContext.Provider value={value.catalogModal}>
              <PriceGroupModalContext.Provider value={value.priceGroupModal}>
                {children}
              </PriceGroupModalContext.Provider>
            </CatalogModalContext.Provider>
          </CatalogsContext.Provider>
        </PriceGroupsContext.Provider>
      </TagsContext.Provider>
    </CategoriesContext.Provider>
  );
}
