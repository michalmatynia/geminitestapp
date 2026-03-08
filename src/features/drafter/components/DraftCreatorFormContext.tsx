'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ProductImageManagerController } from '@/features/products';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  CatalogRecord,
  Producer,
  ProductCategory,
  ProductParameter,
  ProductParameterValue,
  ProductTag,
} from '@/shared/contracts/products';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';

// --- Basic Info Context ---
export interface DraftCreatorBasicInfo {
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
}
const BasicInfoContext = createContext<DraftCreatorBasicInfo | null>(null);
export const useDraftCreatorBasicInfo = () => {
  const context = useContext(BasicInfoContext);
  if (!context)
    throw new Error('useDraftCreatorBasicInfo must be used within DraftCreatorFormProvider');
  return context;
};

// --- Product Data Context ---
export interface DraftCreatorProductData {
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
}
const ProductDataContext = createContext<DraftCreatorProductData | null>(null);
export const useDraftCreatorProductData = () => {
  const context = useContext(ProductDataContext);
  if (!context)
    throw new Error('useDraftCreatorProductData must be used within DraftCreatorFormProvider');
  return context;
};

// --- Metadata Context ---
export interface DraftCreatorMetadata {
  catalogs: CatalogRecord[];
  selectedCatalogIds: string[];
  setSelectedCatalogIds: (nextIds: string[]) => void;
  categories: ProductCategory[];
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
}
const MetadataContext = createContext<DraftCreatorMetadata | null>(null);
export const useDraftCreatorMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context)
    throw new Error('useDraftCreatorMetadata must be used within DraftCreatorFormProvider');
  return context;
};

// --- Images Context ---
export interface DraftCreatorImages {
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  imageManagerController: ProductImageManagerController;
}
const ImagesContext = createContext<DraftCreatorImages | null>(null);
export const useDraftCreatorImages = () => {
  const context = useContext(ImagesContext);
  if (!context)
    throw new Error('useDraftCreatorImages must be used within DraftCreatorFormProvider');
  return context;
};

// --- Parameters Context ---
export interface DraftCreatorParameters {
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  removeParameterValue: (index: number) => void;
}
const ParametersContext = createContext<DraftCreatorParameters | null>(null);
export const useDraftCreatorParameters = () => {
  const context = useContext(ParametersContext);
  if (!context)
    throw new Error('useDraftCreatorParameters must be used within DraftCreatorFormProvider');
  return context;
};

// --- Context Aggregator ---
export interface DraftCreatorFormContextValue
  extends
    DraftCreatorBasicInfo,
    DraftCreatorProductData,
    DraftCreatorMetadata,
    DraftCreatorImages,
    DraftCreatorParameters {}

export function DraftCreatorFormProvider({
  value,
  children,
}: {
  value: DraftCreatorFormContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const basicInfo = useMemo(
    () => ({
      name: value.name,
      setName: value.setName,
      description: value.description,
      setDescription: value.setDescription,
      validatorEnabled: value.validatorEnabled,
      setValidatorEnabled: value.setValidatorEnabled,
      formatterEnabled: value.formatterEnabled,
      setFormatterEnabled: value.setFormatterEnabled,
      icon: value.icon,
      setIcon: value.setIcon,
      iconColorMode: value.iconColorMode,
      setIconColorMode: value.setIconColorMode,
      iconColor: value.iconColor,
      setIconColor: value.setIconColor,
      openProductFormTab: value.openProductFormTab,
      setOpenProductFormTab: value.setOpenProductFormTab,
      resolvedIconColor: value.resolvedIconColor,
      openIconLibrary: value.openIconLibrary,
    }),
    [value]
  );

  const productData = useMemo(
    () => ({
      sku: value.sku,
      setSku: value.setSku,
      identifierType: value.identifierType,
      setIdentifierType: value.setIdentifierType,
      ean: value.ean,
      setEan: value.setEan,
      gtin: value.gtin,
      setGtin: value.setGtin,
      asin: value.asin,
      setAsin: value.setAsin,
      weight: value.weight,
      setWeight: value.setWeight,
      sizeLength: value.sizeLength,
      setSizeLength: value.setSizeLength,
      sizeWidth: value.sizeWidth,
      setSizeWidth: value.setSizeWidth,
      length: value.length,
      setLength: value.setLength,
      nameEn: value.nameEn,
      setNameEn: value.setNameEn,
      namePl: value.namePl,
      setNamePl: value.setNamePl,
      nameDe: value.nameDe,
      setNameDe: value.setNameDe,
      descEn: value.descEn,
      setDescEn: value.setDescEn,
      descPl: value.descPl,
      setDescPl: value.setDescPl,
      descDe: value.descDe,
      setDescDe: value.setDescDe,
      price: value.price,
      setPrice: value.setPrice,
      stock: value.stock,
      setStock: value.setStock,
      supplierName: value.supplierName,
      setSupplierName: value.setSupplierName,
      supplierLink: value.supplierLink,
      setSupplierLink: value.setSupplierLink,
      priceComment: value.priceComment,
      setPriceComment: value.setPriceComment,
      baseProductId: value.baseProductId,
      setBaseProductId: value.setBaseProductId,
    }),
    [value]
  );

  const metadata = useMemo(
    () => ({
      catalogs: value.catalogs,
      selectedCatalogIds: value.selectedCatalogIds,
      setSelectedCatalogIds: value.setSelectedCatalogIds,
      categories: value.categories,
      categoryLoading: value.categoryLoading,
      selectedCategoryId: value.selectedCategoryId,
      setSelectedCategoryId: value.setSelectedCategoryId,
      tags: value.tags,
      tagLoading: value.tagLoading,
      selectedTagIds: value.selectedTagIds,
      setSelectedTagIds: value.setSelectedTagIds,
      producers: value.producers,
      producersLoading: value.producersLoading,
      selectedProducerIds: value.selectedProducerIds,
      setSelectedProducerIds: value.setSelectedProducerIds,
    }),
    [value]
  );

  const images = useMemo(
    () => ({
      showFileManager: value.showFileManager,
      setShowFileManager: value.setShowFileManager,
      handleMultiFileSelect: value.handleMultiFileSelect,
      imageManagerController: value.imageManagerController,
    }),
    [value]
  );

  const parameters = useMemo(
    () => ({
      parameters: value.parameters,
      parametersLoading: value.parametersLoading,
      parameterValues: value.parameterValues,
      addParameterValue: value.addParameterValue,
      updateParameterId: value.updateParameterId,
      updateParameterValue: value.updateParameterValue,
      removeParameterValue: value.removeParameterValue,
    }),
    [value]
  );

  return (
    <BasicInfoContext.Provider value={basicInfo}>
      <ProductDataContext.Provider value={productData}>
        <MetadataContext.Provider value={metadata}>
          <ImagesContext.Provider value={images}>
            <ParametersContext.Provider value={parameters}>{children}</ParametersContext.Provider>
          </ImagesContext.Provider>
        </MetadataContext.Provider>
      </ProductDataContext.Provider>
    </BasicInfoContext.Provider>
  );
}
