'use client';

// ProductFormMetadataContext: supplies catalog/category/tag metadata and
// selection helpers to the product form. Separates metadata fetching from
// form state to keep the form core focused on values and validation.

import { createContext, useContext, useMemo } from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { Producer } from '@/shared/contracts/products/producers';
import type { PriceGroupWithDetails, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';

import { useProductMetadata } from '../hooks/useProductMetadata';

export interface ProductFormMetadataContextType {
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
  shippingGroups: ProductShippingGroup[];
  shippingGroupsLoading: boolean;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  setProducerIds: (producerIds: string[]) => void;
  toggleProducer: (producerId: string) => void;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

export type ProductFormMetadataStateContextType = Pick<
  ProductFormMetadataContextType,
  | 'catalogs'
  | 'catalogsLoading'
  | 'catalogsError'
  | 'selectedCatalogIds'
  | 'categories'
  | 'categoriesLoading'
  | 'selectedCategoryId'
  | 'shippingGroups'
  | 'shippingGroupsLoading'
  | 'tags'
  | 'tagsLoading'
  | 'selectedTagIds'
  | 'producers'
  | 'producersLoading'
  | 'selectedProducerIds'
  | 'filteredLanguages'
  | 'filteredPriceGroups'
>;

export type ProductFormMetadataActionsContextType = Pick<
  ProductFormMetadataContextType,
  'toggleCatalog' | 'setCategoryId' | 'toggleTag' | 'setProducerIds' | 'toggleProducer'
>;

export const ProductFormMetadataContext = createContext<ProductFormMetadataContextType | null>(
  null
);

export function ProductFormMetadataProvider({
  children,
  product,
  draft,
  initialCatalogId,
  onInteraction,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onInteraction?: () => void;
}) {
  const metadata = useProductMetadata({
    product,
    initialCatalogId,
    initialCatalogIds:
      draft?.catalogIds && draft.catalogIds.length > 0
        ? draft.catalogIds
        : initialCatalogId
          ? [initialCatalogId]
          : undefined,
    initialCategoryId: draft?.categoryId ?? null,
    initialTagIds: draft?.tagIds,
    initialProducerIds: draft?.producerIds,
  });

  const value = useMemo(
    () => ({
      ...metadata,
      toggleCatalog: (id: string) => {
        onInteraction?.();
        metadata.toggleCatalog(id);
      },
      setCategoryId: (id: string | null) => {
        onInteraction?.();
        metadata.setCategoryId(id);
      },
      toggleTag: (id: string) => {
        onInteraction?.();
        metadata.toggleTag(id);
      },
      toggleProducer: (id: string) => {
        onInteraction?.();
        metadata.toggleProducer(id);
      },
      setProducerIds: (producerIds: string[]) => {
        onInteraction?.();
        metadata.setProducerIds(producerIds);
      },
    }),
    [metadata, onInteraction]
  );

  return (
    <ProductFormMetadataContext.Provider value={value}>
      {children}
    </ProductFormMetadataContext.Provider>
  );
}

const useRequiredProductFormMetadataContext = (): ProductFormMetadataContextType => {
  const context = useContext(ProductFormMetadataContext);
  if (!context) {
    throw internalError('useProductFormMetadata must be used within a ProductFormMetadataProvider');
  }
  return context;
};

export const useProductFormMetadataState = (): ProductFormMetadataStateContextType => {
  const {
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    categories,
    categoriesLoading,
    selectedCategoryId,
    shippingGroups,
    shippingGroupsLoading,
    tags,
    tagsLoading,
    selectedTagIds,
    producers,
    producersLoading,
    selectedProducerIds,
    filteredLanguages,
    filteredPriceGroups,
  } = useRequiredProductFormMetadataContext();
  return {
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    categories,
    categoriesLoading,
    selectedCategoryId,
    shippingGroups,
    shippingGroupsLoading,
    tags,
    tagsLoading,
    selectedTagIds,
    producers,
    producersLoading,
    selectedProducerIds,
    filteredLanguages,
    filteredPriceGroups,
  };
};

export const useProductFormMetadataActions = (): ProductFormMetadataActionsContextType => {
  const { toggleCatalog, setCategoryId, toggleTag, setProducerIds, toggleProducer } =
    useRequiredProductFormMetadataContext();
  return {
    toggleCatalog,
    setCategoryId,
    toggleTag,
    setProducerIds,
    toggleProducer,
  };
};

export const useProductFormMetadata = (): ProductFormMetadataContextType =>
  useRequiredProductFormMetadataContext();
