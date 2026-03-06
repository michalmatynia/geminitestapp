'use client';

import React from 'react';

import type {
  CatalogRecord,
  Producer,
  ProductCategory,
  ProductTag,
} from '@/shared/contracts/products';

export type ProductMetadataFieldContextValue = {
  catalogs?: CatalogRecord[];
  selectedCatalogIds?: string[];
  onCatalogsChange?: (nextIds: string[]) => void;
  catalogsLoading?: boolean;
  categories?: ProductCategory[];
  selectedCategoryId?: string | null;
  onCategoryChange?: (nextId: string | null) => void;
  categoriesLoading?: boolean;
  tags?: ProductTag[];
  selectedTagIds?: string[];
  onTagsChange?: (nextIds: string[]) => void;
  tagsLoading?: boolean;
  producers?: Producer[];
  selectedProducerIds?: string[];
  onProducersChange?: (nextIds: string[]) => void;
  producersLoading?: boolean;
};

type ProductMetadataFieldActionKey =
  | 'onCatalogsChange'
  | 'onCategoryChange'
  | 'onTagsChange'
  | 'onProducersChange';

export type ProductMetadataFieldStateContextValue = Omit<
  ProductMetadataFieldContextValue,
  ProductMetadataFieldActionKey
>;
export type ProductMetadataFieldActionsContextValue = Pick<
  ProductMetadataFieldContextValue,
  ProductMetadataFieldActionKey
>;

const ProductMetadataFieldStateContext =
  React.createContext<ProductMetadataFieldStateContextValue | null>(null);
const ProductMetadataFieldActionsContext =
  React.createContext<ProductMetadataFieldActionsContextValue | null>(null);

export function ProductMetadataFieldProvider({
  value,
  children,
}: {
  value: ProductMetadataFieldContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    catalogs,
    selectedCatalogIds,
    catalogsLoading,
    categories,
    selectedCategoryId,
    categoriesLoading,
    tags,
    selectedTagIds,
    tagsLoading,
    producers,
    selectedProducerIds,
    producersLoading,
    onCatalogsChange,
    onCategoryChange,
    onTagsChange,
    onProducersChange,
  } = value;

  const stateValue: ProductMetadataFieldStateContextValue = {
    catalogs,
    selectedCatalogIds,
    catalogsLoading,
    categories,
    selectedCategoryId,
    categoriesLoading,
    tags,
    selectedTagIds,
    tagsLoading,
    producers,
    selectedProducerIds,
    producersLoading,
  };

  const actionsValue: ProductMetadataFieldActionsContextValue = {
    onCatalogsChange,
    onCategoryChange,
    onTagsChange,
    onProducersChange,
  };

  return (
    <ProductMetadataFieldActionsContext.Provider value={actionsValue}>
      <ProductMetadataFieldStateContext.Provider value={stateValue}>
        {children}
      </ProductMetadataFieldStateContext.Provider>
    </ProductMetadataFieldActionsContext.Provider>
  );
}

export function useOptionalProductMetadataFieldStateContext(): ProductMetadataFieldStateContextValue | null {
  return React.useContext(ProductMetadataFieldStateContext);
}

export function useOptionalProductMetadataFieldActionsContext(): ProductMetadataFieldActionsContextValue | null {
  return React.useContext(ProductMetadataFieldActionsContext);
}
