'use client';

import { createContext, useContext, useMemo } from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type {
  CatalogRecord,
  ProductCategory,
  ProductTag,
  Producer,
  PriceGroupWithDetails,
  ProductWithImages,
  ProductDraft,
} from '@/shared/contracts/products';
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
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  toggleProducer: (producerId: string) => void;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

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
    }),
    [metadata, onInteraction]
  );

  return (
    <ProductFormMetadataContext.Provider value={value}>
      {children}
    </ProductFormMetadataContext.Provider>
  );
}

export const useProductFormMetadata = (): ProductFormMetadataContextType => {
  const context = useContext(ProductFormMetadataContext);
  if (!context) {
    throw internalError('useProductFormMetadata must be used within a ProductFormMetadataProvider');
  }
  return context;
};
