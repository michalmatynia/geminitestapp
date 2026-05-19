'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import { ProductFormDimensionsFields } from './ProductFormDimensionsFields';
import { ProductFormGeneralLanguageFields } from './ProductFormGeneralLanguageFields';
import ProductFormLatestAmazonExtraction from './ProductFormLatestAmazonExtraction';
import { ProductFormIdentifierFields } from './ProductFormIdentifierFields';
import type {
  ProductFormGeneralDisplayValues,
  ProductFormLanguage,
} from './ProductFormGeneral.types';
import { useProductFormGeneralWatchedValues } from './useProductFormGeneralWatchedValues';
import { useProductFormLanguageTabs } from './useProductFormLanguageTabs';
import {
  useProductFormPolishNameAutoSync,
  type ProductFormPolishNameCategories,
} from './useProductFormPolishNameAutoSync';

const readMetadataArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const DEFAULT_FORM_LANGUAGES: ProductFormLanguage[] = [
  { code: 'EN', name: 'English' },
  { code: 'PL', name: 'Polish' },
];

const resolveFormLanguages = (
  rawLanguages: ProductFormLanguage[],
  catalogsLoading: boolean,
  languagesLoading: boolean
): ProductFormLanguage[] => {
  if (rawLanguages.length > 0) return rawLanguages;
  if (catalogsLoading || languagesLoading) return rawLanguages;
  return DEFAULT_FORM_LANGUAGES;
};

const useProductFormGeneralState = (): {
	  productFormMetadata: ReturnType<typeof useProductFormMetadata>;
	  filteredLanguages: ProductFormLanguage[];
	  displayValues: ProductFormGeneralDisplayValues;
	  languageTabs: ReturnType<typeof useProductFormLanguageTabs>;
	} => {
  const productFormMetadata = useProductFormMetadata();
  const { getValues, setValue, watch } = useFormContext<ProductFormData>();
  const rawFilteredLanguages = readMetadataArray<ProductFormLanguage>(
    productFormMetadata.filteredLanguages
  );
  const filteredLanguages = resolveFormLanguages(
    rawFilteredLanguages,
    productFormMetadata.catalogsLoading,
    productFormMetadata.languagesLoading
  );
  const categories = readMetadataArray<NonNullable<ProductFormPolishNameCategories>[number]>(
    productFormMetadata.categories
  );
  const { watchedValues, displayValues } = useProductFormGeneralWatchedValues(watch);
  const languageTabs = useProductFormLanguageTabs(filteredLanguages);

  useProductFormPolishNameAutoSync({
    languageTabValues: languageTabs.languageTabValues,
    categories,
    categoriesLoading: productFormMetadata.categoriesLoading,
    nameEn: watchedValues.nameEn,
    namePl: watchedValues.namePl,
    getValues,
    setValue,
  });

  return {
    productFormMetadata,
    filteredLanguages,
    displayValues,
    languageTabs,
  };
};

export default function ProductFormGeneral(): React.JSX.Element {
  const { productFormMetadata, filteredLanguages, displayValues, languageTabs } =
    useProductFormGeneralState();

  return (
    <div className='space-y-6'>
      <ProductFormGeneralLanguageFields
        hasCatalogs={
          productFormMetadata.catalogsLoading ||
          productFormMetadata.languagesLoading ||
          productFormMetadata.hasExistingProduct ||
          productFormMetadata.selectedCatalogIds.length > 0
        }
        languagesReady={filteredLanguages.length > 0}
        filteredLanguages={filteredLanguages}
        displayValues={displayValues}
        resolvedActiveNameTab={languageTabs.resolvedActiveNameTab}
        resolvedActiveDescriptionTab={languageTabs.resolvedActiveDescriptionTab}
        setActiveNameTab={languageTabs.setActiveNameTab}
        setActiveDescriptionTab={languageTabs.setActiveDescriptionTab}
      />
      <ProductFormLatestAmazonExtraction />
      <ProductFormIdentifierFields />
      <ProductFormDimensionsFields />
    </div>
  );
}
