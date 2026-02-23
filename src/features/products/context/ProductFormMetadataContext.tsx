'use client';

import { createContext, useContext } from 'react';
import type { 
  CatalogRecord, 
  ProductCategory, 
  ProductTag, 
  Producer, 
  PriceGroupWithDetails 
} from '@/shared/contracts/products';
import type { LanguageDto as Language } from '@/shared/contracts/internationalization';
import { internalError } from '@/shared/errors/app-error';

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

export const ProductFormMetadataContext = createContext<ProductFormMetadataContextType | null>(null);

export const useProductFormMetadata = (): ProductFormMetadataContextType => {
  const context = useContext(ProductFormMetadataContext);
  if (!context) {
    throw internalError('useProductFormMetadata must be used within a ProductFormMetadataProvider');
  }
  return context;
};
