'use client';

import React from 'react';

import type { Catalog, PriceGroup, ProductCategoryWithChildren, ProductTag } from '@/features/products/types';

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
};

const ProductSettingsContext = React.createContext<ProductSettingsContextValue | null>(null);

export function ProductSettingsProvider({
  value,
  children,
}: {
  value: ProductSettingsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ProductSettingsContext.Provider value={value}>
      {children}
    </ProductSettingsContext.Provider>
  );
}

export function useProductSettingsContext(): ProductSettingsContextValue {
  const context = React.useContext(ProductSettingsContext);
  if (!context) {
    throw new Error('useProductSettingsContext must be used inside ProductSettingsProvider');
  }
  return context;
}
