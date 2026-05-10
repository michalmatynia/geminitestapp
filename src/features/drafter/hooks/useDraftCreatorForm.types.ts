import type { Dispatch, SetStateAction } from 'react';

import type { useDraft, useCreateDraftMutation, useUpdateDraftMutation } from '@/features/drafter/hooks/useDraftQueries';
import type { useProductImages } from '@/features/products/forms.public';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductDraftKind, ProductDraftOpenFormTab } from '@/shared/contracts/products';
import type { useDraftMetadata } from './useDraftMetadata';
import type { useDraftCreatorParameters } from './useDraftCreatorParameters';

export const DEFAULT_ICON_COLOR = '#60a5fa';
export const TOTAL_DRAFT_IMAGE_SLOTS = 15;

export type StateSetter<T> = Dispatch<SetStateAction<T>>;
export type IdentifierType = 'ean' | 'gtin' | 'asin';
export type IconColorMode = 'theme' | 'custom';
export type DraftCreatorParametersRuntime = ReturnType<typeof useDraftCreatorParameters>;
export type DraftCreatorImagesRuntime = ReturnType<typeof useProductImages>;
export type DraftCreatorMetadataRuntime = ReturnType<typeof useDraftMetadata> & {
  parameters: ProductParameter[];
};

export type DraftCreatorQueries = {
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  createDraftMutation: ReturnType<typeof useCreateDraftMutation>;
  draftQuery: ReturnType<typeof useDraft>;
  producers: Producer[];
  producersLoading: boolean;
  updateDraftMutation: ReturnType<typeof useUpdateDraftMutation>;
};

export type DraftCreatorFormState = {
  active: boolean;
  addParameterValue: () => void;
  asin: string;
  baseProductId: string;
  descDe: string;
  descEn: string;
  descPl: string;
  description: string;
  draftKind: ProductDraftKind;
  ean: string;
  formatterEnabled: boolean;
  gtin: string;
  icon: string | null;
  iconColor: string;
  iconColorMode: IconColorMode;
  identifierType: IdentifierType;
  isIconLibraryOpen: boolean;
  length: string;
  name: string;
  nameDe: string;
  nameEn: string;
  namePl: string;
  openProductFormTab: ProductDraftOpenFormTab;
  parameterValues: ProductParameterValue[];
  price: string;
  priceComment: string;
  removeParameterValue: (index: number) => void;
  scrapeProfileId: string | null;
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedProducerIds: string[];
  selectedTagIds: string[];
  setActive: (value: boolean) => void;
  setAsin: StateSetter<string>;
  setBaseProductId: StateSetter<string>;
  setDescDe: StateSetter<string>;
  setDescEn: StateSetter<string>;
  setDescPl: StateSetter<string>;
  setDescription: StateSetter<string>;
  setDraftKind: (next: ProductDraftKind) => void;
  setEan: StateSetter<string>;
  setFormatterEnabled: StateSetter<boolean>;
  setGtin: StateSetter<string>;
  setIcon: StateSetter<string | null>;
  setIconColor: StateSetter<string>;
  setIconColorMode: StateSetter<IconColorMode>;
  setIdentifierType: StateSetter<IdentifierType>;
  setIsIconLibraryOpen: StateSetter<boolean>;
  setLength: StateSetter<string>;
  setName: StateSetter<string>;
  setNameDe: StateSetter<string>;
  setNameEn: StateSetter<string>;
  setNamePl: StateSetter<string>;
  setOpenProductFormTab: StateSetter<ProductDraftOpenFormTab>;
  setParameterValues: DraftCreatorParametersRuntime['setParameterValues'];
  setPrice: StateSetter<string>;
  setPriceComment: StateSetter<string>;
  setScrapeProfileId: (next: string | null) => void;
  setSelectedCatalogIds: StateSetter<string[]>;
  setSelectedCategoryId: StateSetter<string | null>;
  setSelectedProducerIds: StateSetter<string[]>;
  setSelectedTagIds: StateSetter<string[]>;
  setSizeLength: StateSetter<string>;
  setSizeWidth: StateSetter<string>;
  setSku: StateSetter<string>;
  setStock: StateSetter<string>;
  setSupplierLink: StateSetter<string>;
  setSupplierName: StateSetter<string>;
  setValidatorEnabled: StateSetter<boolean>;
  setWeight: StateSetter<string>;
  sizeLength: string;
  sizeWidth: string;
  sku: string;
  stock: string;
  supplierLink: string;
  supplierName: string;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  validatorEnabled: boolean;
  weight: string;
};

export type DraftCreatorBaseState = Omit<
  DraftCreatorFormState,
  | 'active'
  | 'addParameterValue'
  | 'draftKind'
  | 'parameterValues'
  | 'removeParameterValue'
  | 'scrapeProfileId'
  | 'setActive'
  | 'setDraftKind'
  | 'setParameterValues'
  | 'setScrapeProfileId'
  | 'updateParameterId'
  | 'updateParameterValue'
> & {
  activeState: boolean;
  draftKind: ProductDraftKind;
  draftKindDirty: boolean;
  scrapeProfileDirty: boolean;
  scrapeProfileId: string | null;
  setActiveState: StateSetter<boolean>;
  setDraftKindDirty: StateSetter<boolean>;
  setDraftKindState: StateSetter<ProductDraftKind>;
  setScrapeProfileDirty: StateSetter<boolean>;
  setScrapeProfileIdState: StateSetter<string | null>;
};

export type DraftCreatorFormRuntime = {
  actions: { handleSave: () => Promise<void>; handleSaveSuccess: () => void };
  images: DraftCreatorImagesRuntime;
  metadata: DraftCreatorMetadataRuntime;
  queries: DraftCreatorQueries;
  state: DraftCreatorFormState;
};
