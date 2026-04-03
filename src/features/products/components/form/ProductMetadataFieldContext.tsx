'use client';

import React from 'react';

import type {
  CatalogRecord,
  Producer,
  ProductCategory,
  ProductTag,
} from '@/shared/contracts/products';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: ProductMetadataFieldStateContext,
  useOptionalContext: useOptionalProductMetadataFieldStateContext,
} = createStrictContext<ProductMetadataFieldStateContextValue>({
  hookName: 'useProductMetadataFieldStateContext',
  providerName: 'ProductMetadataFieldProvider',
  displayName: 'ProductMetadataFieldStateContext',
});

const {
  Context: ProductMetadataFieldActionsContext,
  useOptionalContext: useOptionalProductMetadataFieldActionsContext,
} = createStrictContext<ProductMetadataFieldActionsContextValue>({
  hookName: 'useProductMetadataFieldActionsContext',
  providerName: 'ProductMetadataFieldProvider',
  displayName: 'ProductMetadataFieldActionsContext',
});

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

export {
  useOptionalProductMetadataFieldActionsContext,
  useOptionalProductMetadataFieldStateContext,
};
