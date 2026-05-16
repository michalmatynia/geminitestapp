'use client';

import React, { useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductValidationState } from '@/features/products/context/ProductValidationSettingsContext';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import { ProductFormDimensionsFields } from './ProductFormDimensionsFields';
import { ProductFormGeneralLanguageFields } from './ProductFormGeneralLanguageFields';
import ProductFormLatestAmazonExtraction from './ProductFormLatestAmazonExtraction';
import { ProductFormIdentifierFields } from './ProductFormIdentifierFields';
import type { ProductFormLanguage } from './ProductFormGeneral.types';
import { useProductFormGeneralFocus } from './useProductFormGeneralFocus';
import {
  useCompiledProductValidationPatterns,
  useProductFormGeneralFormatter,
} from './useProductFormGeneralFormatter';
import { useProductFormGeneralWatchedValues } from './useProductFormGeneralWatchedValues';
import { useProductFormLanguageTabs } from './useProductFormLanguageTabs';
import {
  useProductFormPolishNameAutoSync,
  type ProductFormPolishNameCategories,
} from './useProductFormPolishNameAutoSync';

const readMetadataArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export default function ProductFormGeneral(): React.JSX.Element {
  const validationState = useProductValidationState();
  const productFormMetadata = useProductFormMetadata();
  const { getValues, setValue, watch } = useFormContext<ProductFormData>();
  const sequenceGroupDebounceRef = useRef<Record<string, number>>({});
  const formatterLoopGuardRef = useRef<{ recentSignatures: string[]; cycleHits: number }>({
    recentSignatures: [],
    cycleHits: 0,
  });
  const filteredLanguages = readMetadataArray<ProductFormLanguage>(
    productFormMetadata.filteredLanguages
  );
  const categories = readMetadataArray<NonNullable<ProductFormPolishNameCategories>[number]>(
    productFormMetadata.categories
  );
  const focusedFieldName = useProductFormGeneralFocus();
  const { watchedValues, displayValues } = useProductFormGeneralWatchedValues(watch);
  const languageTabs = useProductFormLanguageTabs(filteredLanguages);
  const compiledPatterns = useCompiledProductValidationPatterns(validationState.validatorPatterns);

  useProductFormPolishNameAutoSync({
    languageTabValues: languageTabs.languageTabValues,
    categories,
    nameEn: watchedValues.nameEn,
    namePl: watchedValues.namePl,
    getValues,
    setValue,
  });
  useProductFormGeneralFormatter({
    validatorEnabled: validationState.validatorEnabled,
    formatterEnabled: validationState.formatterEnabled,
    validationInstanceScope: validationState.validationInstanceScope,
    compiledPatterns,
    latestProductValues: validationState.latestProductValues,
    watchedValues,
    focusedFieldName,
    getValues,
    setValue,
    sequenceGroupDebounceRef,
    formatterLoopGuardRef,
  });

  return (
    <div className='space-y-6'>
      <ProductFormGeneralLanguageFields
        hasCatalogs={filteredLanguages.length > 0}
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
