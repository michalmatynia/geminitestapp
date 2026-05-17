import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { PriceGroupWithDetails, ProductWithImages } from '@/shared/contracts/products/product';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import type { ProductTag } from '@/shared/contracts/products/tags';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

export interface ProductMetadataHookResult {
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
  parameters: ProductParameter[];
  parametersLoading: boolean;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

export interface UseProductMetadataProps {
  product?: ProductWithImages | undefined;
  initialCatalogId?: string | undefined;
  initialCatalogIds?: string[] | undefined;
  initialCategoryId?: string | null | undefined;
  initialTagIds?: string[] | undefined;
  initialProducerIds?: string[] | undefined;
  setValue?: UseFormSetValue<ProductFormData> | undefined;
  getValues?: UseFormGetValues<ProductFormData> | undefined;
}

export interface ProductMetadataInitialSelections {
  catalogIds: string[];
  categoryId: string | null;
  producerIds: string[];
  tagIds: string[];
}

export interface ProductMetadataSelectionState {
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedProducerIds: string[];
  selectedTagIds: string[];
  setCategoryId: (categoryId: string | null) => void;
  setProducerIds: (producerIds: string[]) => void;
  toggleCatalog: (catalogId: string) => void;
  toggleProducer: (producerId: string) => void;
  toggleTag: (tagId: string) => void;
}

export interface FilteredProductMetadata {
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
}

export interface ProductMetadataResultInput {
  catalogs: CatalogRecord[];
  catalogsError: unknown;
  catalogsLoading: boolean;
  languagesLoading: boolean;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  filtered: FilteredProductMetadata;
  parameters: ProductParameter[];
  parametersLoading: boolean;
  producers: Producer[];
  producersLoading: boolean;
  selection: ProductMetadataSelectionState;
  shippingGroups: ProductShippingGroup[];
  shippingGroupsLoading: boolean;
  tags: ProductTag[];
  tagsLoading: boolean;
}
