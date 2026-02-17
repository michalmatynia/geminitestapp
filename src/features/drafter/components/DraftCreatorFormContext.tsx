'use client';

import { createContext, useContext } from 'react';

import type { ProductImageManagerController } from '@/features/products/components/ProductImageManager';
import type {
  CatalogRecord,
  Producer,
  ProductCategoryDto,
  ProductParameterValue,
  ProductSimpleParameter,
  ProductTag,
} from '@/features/products/types';
import type { ProductDraftOpenFormTab } from '@/features/products/types/drafts';
import type { ImageFileSelection } from '@/shared/types/domain/files';

export interface DraftCreatorFormContextValue {
  name: string;
  setName: (next: string) => void;
  description: string;
  setDescription: (next: string) => void;
  validatorEnabled: boolean;
  setValidatorEnabled: (next: boolean) => void;
  formatterEnabled: boolean;
  setFormatterEnabled: (next: boolean) => void;
  icon: string | null;
  setIcon: (next: string | null) => void;
  iconColorMode: 'theme' | 'custom';
  setIconColorMode: (next: 'theme' | 'custom') => void;
  iconColor: string;
  setIconColor: (next: string) => void;
  openProductFormTab: ProductDraftOpenFormTab;
  setOpenProductFormTab: (next: ProductDraftOpenFormTab) => void;
  resolvedIconColor: string;
  openIconLibrary: () => void;
  sku: string;
  setSku: (next: string) => void;
  identifierType: 'ean' | 'gtin' | 'asin';
  setIdentifierType: (next: 'ean' | 'gtin' | 'asin') => void;
  ean: string;
  setEan: (next: string) => void;
  gtin: string;
  setGtin: (next: string) => void;
  asin: string;
  setAsin: (next: string) => void;
  weight: string;
  setWeight: (next: string) => void;
  sizeLength: string;
  setSizeLength: (next: string) => void;
  sizeWidth: string;
  setSizeWidth: (next: string) => void;
  length: string;
  setLength: (next: string) => void;
  nameEn: string;
  setNameEn: (next: string) => void;
  namePl: string;
  setNamePl: (next: string) => void;
  nameDe: string;
  setNameDe: (next: string) => void;
  descEn: string;
  setDescEn: (next: string) => void;
  descPl: string;
  setDescPl: (next: string) => void;
  descDe: string;
  setDescDe: (next: string) => void;
  price: string;
  setPrice: (next: string) => void;
  stock: string;
  setStock: (next: string) => void;
  supplierName: string;
  setSupplierName: (next: string) => void;
  supplierLink: string;
  setSupplierLink: (next: string) => void;
  priceComment: string;
  setPriceComment: (next: string) => void;
  baseProductId: string;
  setBaseProductId: (next: string) => void;
  catalogs: CatalogRecord[];
  selectedCatalogIds: string[];
  setSelectedCatalogIds: (nextIds: string[]) => void;
  categories: ProductCategoryDto[];
  categoryLoading: boolean;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (nextId: string | null) => void;
  tags: ProductTag[];
  tagLoading: boolean;
  selectedTagIds: string[];
  setSelectedTagIds: (nextIds: string[]) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  setSelectedProducerIds: (nextIds: string[]) => void;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  imageManagerController: ProductImageManagerController;
  parameters: ProductSimpleParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  removeParameterValue: (index: number) => void;
}

const DraftCreatorFormContext = createContext<DraftCreatorFormContextValue | null>(null);

export function DraftCreatorFormProvider({
  value,
  children,
}: {
  value: DraftCreatorFormContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DraftCreatorFormContext.Provider value={value}>
      {children}
    </DraftCreatorFormContext.Provider>
  );
}

export function useDraftCreatorFormContext(): DraftCreatorFormContextValue {
  const context = useContext(DraftCreatorFormContext);
  if (!context) {
    throw new Error('useDraftCreatorFormContext must be used within DraftCreatorFormProvider');
  }
  return context;
}
