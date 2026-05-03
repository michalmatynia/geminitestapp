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

const useRequiredProductSettingsSection = <T,>(context: T | null, hookName: string): T => {
  if (context === null) {
    throw internalError(`${hookName} must be used within ProductSettingsPageProvider`);
  }
  return context;
};

export type ProductSettingsCategoriesSection = {
  loading: boolean;
  categories: ProductCategoryWithChildren[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};
const CategoriesContext = createContext<ProductSettingsCategoriesSection | null>(null);
export const useProductSettingsCategoriesSection = (): ProductSettingsCategoriesSection =>
  useRequiredProductSettingsSection(
    useContext(CategoriesContext),
    'useProductSettingsCategoriesSection'
  );

export type ProductSettingsTagsSection = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};
const TagsContext = createContext<ProductSettingsTagsSection | null>(null);
export const useProductSettingsTagsSection = (): ProductSettingsTagsSection =>
  useRequiredProductSettingsSection(useContext(TagsContext), 'useProductSettingsTagsSection');

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
export const useProductSettingsPriceGroupsSection = (): ProductSettingsPriceGroupsSection =>
  useRequiredProductSettingsSection(
    useContext(PriceGroupsContext),
    'useProductSettingsPriceGroupsSection'
  );

export type ProductSettingsCatalogsSection = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};
const CatalogsContext = createContext<ProductSettingsCatalogsSection | null>(null);
export const useProductSettingsCatalogsSection = (): ProductSettingsCatalogsSection =>
  useRequiredProductSettingsSection(useContext(CatalogsContext), 'useProductSettingsCatalogsSection');

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
export const useProductSettingsCatalogModalSection = (): ProductSettingsCatalogModalSection =>
  useRequiredProductSettingsSection(
    useContext(CatalogModalContext),
    'useProductSettingsCatalogModalSection'
  );

export type ProductSettingsPriceGroupModalSection = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup: PriceGroup | null;
  priceGroups: PriceGroup[];
};
const PriceGroupModalContext = createContext<ProductSettingsPriceGroupModalSection | null>(null);
export const useProductSettingsPriceGroupModalSection = (): ProductSettingsPriceGroupModalSection =>
  useRequiredProductSettingsSection(
    useContext(PriceGroupModalContext),
    'useProductSettingsPriceGroupModalSection'
  );

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
