'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import {
  normalizeStructuredProductName,
  normalizeTitleTermName,
  syncPolishStructuredProductName,
  type PolishStructuredProductNameSyncResult,
} from '@/shared/lib/products/title-terms';

import { coerceWatchedString } from './ProductFormGeneral.helpers';

type StructuredNameCategories = Parameters<typeof syncPolishStructuredProductName>[0]['categories'];
export type ProductFormPolishNameCategories = StructuredNameCategories;

type PolishBaseNameAutoSyncStateUpdate = {
  generatedPolishTitle: string | null;
  shouldDisableAutoSync: boolean;
};

type UseProductFormPolishNameAutoSyncInput = {
  languageTabValues: string[];
  categories: StructuredNameCategories;
  nameEn: unknown;
  namePl: unknown;
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
};

type BuildGeneratedPolishNameInput = Parameters<typeof syncPolishStructuredProductName>[0] & {
  languageTabValues: string[];
};

const normalizeGeneratedTitleComparisonKey = (value: string): string =>
  normalizeTitleTermName(normalizeStructuredProductName(value));

const matchesGeneratedPolishTitle = (
  currentNamePl: string,
  generatedPolishTitle: string
): boolean =>
  normalizeGeneratedTitleComparisonKey(currentNamePl) ===
  normalizeGeneratedTitleComparisonKey(generatedPolishTitle);

const resolvePolishBaseNameAutoSyncStateUpdate = ({
  currentNamePl,
  syncResult,
}: {
  currentNamePl: string;
  syncResult: PolishStructuredProductNameSyncResult;
}): PolishBaseNameAutoSyncStateUpdate => {
  if (
    syncResult.baseNameSynced ||
    matchesGeneratedPolishTitle(currentNamePl, syncResult.generatedPolishTitle)
  ) {
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

const buildGeneratedPolishName = ({
  languageTabValues,
  ...syncInput
}: BuildGeneratedPolishNameInput): PolishStructuredProductNameSyncResult | null => {
  if (languageTabValues.includes('pl') === false) return null;
  if (syncInput.englishTitle.trim() === '') return null;
  return syncPolishStructuredProductName(syncInput);
};

export const useProductFormPolishNameAutoSync = ({
  languageTabValues,
  categories,
  nameEn,
  namePl,
  getValues,
  setValue,
}: UseProductFormPolishNameAutoSyncInput): void => {
  const sizeTermsQuery = useTitleTerms(undefined, 'size', { allowWithoutCatalog: true });
  const materialTermsQuery = useTitleTerms(undefined, 'material', { allowWithoutCatalog: true });
  const themeTermsQuery = useTitleTerms(undefined, 'theme', { allowWithoutCatalog: true });
  const lastGeneratedPolishNameRef = useRef<string>('');
  const polishBaseNameAutoSyncRef = useRef<boolean>(true);
  const generatedPolishName = useMemo(
    () =>
      buildGeneratedPolishName({
        languageTabValues,
        englishTitle: coerceWatchedString(nameEn),
        polishTitle: coerceWatchedString(namePl),
        previousGeneratedPolishTitle: lastGeneratedPolishNameRef.current,
        syncPreviousGeneratedBaseName: polishBaseNameAutoSyncRef.current,
        sizeTerms: sizeTermsQuery.data,
        materialTerms: materialTermsQuery.data,
        categories,
        themeTerms: themeTermsQuery.data,
      }),
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

  useLayoutEffect(() => {
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
