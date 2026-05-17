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
  languagesLoading: boolean;
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
  hasExistingProduct: boolean;
}

export type ProductFormMetadataStateContextType = Pick<
  ProductFormMetadataContextType,
  | 'catalogs'
  | 'catalogsLoading'
  | 'catalogsError'
  | 'languagesLoading'
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
  | 'hasExistingProduct'
>;

export type ProductFormMetadataActionsContextType = Pick<
  ProductFormMetadataContextType,
  'toggleCatalog' | 'setCategoryId' | 'toggleTag' | 'setProducerIds' | 'toggleProducer'
>;

export const ProductFormMetadataContext = createContext<ProductFormMetadataContextType | null>(
  null
);

type ProductFormMetadataProviderProps = {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onInteraction?: () => void;
};

const resolveInitialCatalogIds = (
  draft: ProductDraft | null | undefined,
  initialCatalogId: string | undefined
): string[] | undefined => {
  if (draft?.catalogIds !== undefined && draft.catalogIds.length > 0) return draft.catalogIds;
  if (initialCatalogId !== undefined && initialCatalogId !== '') return [initialCatalogId];
  return undefined;
};

export function ProductFormMetadataProvider({
  children,
  product,
  draft,
  initialCatalogId,
  onInteraction,
}: ProductFormMetadataProviderProps): React.JSX.Element {
  const metadata = useProductMetadata({
    product,
    initialCatalogId,
    initialCatalogIds: resolveInitialCatalogIds(draft, initialCatalogId),
    initialCategoryId: draft?.categoryId ?? null,
    initialTagIds: draft?.tagIds,
    initialProducerIds: draft?.producerIds,
  });

  const contextValue = useMemo(
    () => ({
      ...metadata,
      hasExistingProduct: product !== undefined,
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
    [metadata, onInteraction, product]
  );

  return (
    <ProductFormMetadataContext.Provider value={contextValue}>
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
    languagesLoading,
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
    hasExistingProduct,
  } = useRequiredProductFormMetadataContext();
  return {
    catalogs,
    catalogsLoading,
    catalogsError,
    languagesLoading,
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
    hasExistingProduct,
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
