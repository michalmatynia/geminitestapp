'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import {
  syncPolishStructuredProductName,
  type PolishStructuredProductNameSyncResult,
} from '@/shared/lib/products/title-terms';

import { coerceWatchedString } from './ProductFormGeneral.helpers';

type StructuredNameCategories = Parameters<typeof syncPolishStructuredProductName>[0]['categories'];

type PolishBaseNameAutoSyncStateUpdate = {
  generatedPolishTitle: string | null;
  shouldDisableAutoSync: boolean;
};

type UseProductFormPolishNameAutoSyncInput = {
  primaryCatalogId: string | undefined;
  languageTabValues: string[];
  categories: StructuredNameCategories;
  nameEn: unknown;
  namePl: unknown;
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
};

const resolvePolishBaseNameAutoSyncStateUpdate = ({
  currentNamePl,
  syncResult,
}: {
  currentNamePl: string;
  syncResult: PolishStructuredProductNameSyncResult;
}): PolishBaseNameAutoSyncStateUpdate => {
  if (syncResult.baseNameSynced) {
    return {
      generatedPolishTitle: syncResult.generatedPolishTitle,
      shouldDisableAutoSync: false,
    };
  }

  return {
    generatedPolishTitle: null,
    shouldDisableAutoSync: currentNamePl.trim() !== '',
  };
};

export const useProductFormPolishNameAutoSync = ({
  primaryCatalogId,
  languageTabValues,
  categories,
  nameEn,
  namePl,
  getValues,
  setValue,
}: UseProductFormPolishNameAutoSyncInput): void => {
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
  const lastGeneratedPolishNameRef = useRef<string>('');
  const polishBaseNameAutoSyncRef = useRef<boolean>(true);
  const generatedPolishName = useMemo(
    () =>
      languageTabValues.includes('pl')
        ? syncPolishStructuredProductName({
            englishTitle: coerceWatchedString(nameEn),
            polishTitle: coerceWatchedString(namePl),
            previousGeneratedPolishTitle: lastGeneratedPolishNameRef.current,
            syncPreviousGeneratedBaseName: polishBaseNameAutoSyncRef.current,
            sizeTerms: sizeTermsQuery.data,
            materialTerms: materialTermsQuery.data,
            categories,
            themeTerms: themeTermsQuery.data,
          })
        : null,
    [
      categories,
      languageTabValues,
      materialTermsQuery.data,
      nameEn,
      namePl,
      sizeTermsQuery.data,
      themeTermsQuery.data,
    ]
  );

  useEffect(() => {
    if (languageTabValues.includes('pl') === false) return;
    if (generatedPolishName === null) return;

    const rawNamePl = getValues('name_pl');
    const currentNamePl = coerceWatchedString(rawNamePl);
    const autoSyncStateUpdate = resolvePolishBaseNameAutoSyncStateUpdate({
      currentNamePl,
      syncResult: generatedPolishName,
    });
    if (autoSyncStateUpdate.generatedPolishTitle !== null) {
      lastGeneratedPolishNameRef.current = autoSyncStateUpdate.generatedPolishTitle;
    }
    if (autoSyncStateUpdate.shouldDisableAutoSync) {
      polishBaseNameAutoSyncRef.current = false;
    }
    if (currentNamePl === generatedPolishName.polishTitle) return;
    setValue('name_pl', generatedPolishName.polishTitle, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [generatedPolishName, getValues, languageTabValues, setValue]);
};
