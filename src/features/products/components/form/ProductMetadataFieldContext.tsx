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

const ProductMetadataFieldContext = React.createContext<ProductMetadataFieldContextValue | null>(
  null
);

export function ProductMetadataFieldProvider({
  value,
  children,
}: {
  value: ProductMetadataFieldContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ProductMetadataFieldContext.Provider value={value}>
      {children}
    </ProductMetadataFieldContext.Provider>
  );
}

export function useOptionalProductMetadataFieldContext(): ProductMetadataFieldContextValue | null {
  return React.useContext(ProductMetadataFieldContext);
}
