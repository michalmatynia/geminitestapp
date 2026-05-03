'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';

import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';
import {
  syncPolishStructuredProductName,
  type PolishStructuredProductNameSyncResult,
} from '@/shared/lib/products/title-terms';

type UseDraftPolishNameAutoSyncInput = {
  categories: ProductCategory[];
  nameEn: string;
  namePl: string;
  primaryCatalogId: string;
  resetKey: string;
  setNamePl: (next: string) => void;
};

type PolishNameAutoSyncRefs = {
  lastGeneratedPolishNameRef: MutableRefObject<string>;
  polishBaseNameAutoSyncRef: MutableRefObject<boolean>;
};

type DraftPolishTitleTerms = {
  materialTerms: ProductTitleTerm[] | undefined;
  sizeTerms: ProductTitleTerm[] | undefined;
  themeTerms: ProductTitleTerm[] | undefined;
};

const resolvePolishBaseNameAutoSyncStateUpdate = ({
  currentNamePl,
  syncResult,
}: {
  currentNamePl: string;
  syncResult: PolishStructuredProductNameSyncResult;
}): { generatedPolishTitle: string | null; shouldDisableAutoSync: boolean } => {
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

const useDraftPolishTitleTerms = (primaryCatalogId: string): DraftPolishTitleTerms => {
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size', {
    allowWithoutCatalog: true,
  });
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material', {
    allowWithoutCatalog: true,
  });
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme', {
    allowWithoutCatalog: true,
  });

  return useMemo(
    () => ({
      materialTerms: materialTermsQuery.data,
      sizeTerms: sizeTermsQuery.data,
      themeTerms: themeTermsQuery.data,
    }),
    [materialTermsQuery.data, sizeTermsQuery.data, themeTermsQuery.data]
  );
};

const useGeneratedDraftPolishName = ({
  categories,
  nameEn,
  namePl,
  terms,
  refs,
}: Pick<UseDraftPolishNameAutoSyncInput, 'categories' | 'nameEn' | 'namePl'> & {
  refs: PolishNameAutoSyncRefs;
  terms: DraftPolishTitleTerms;
}): PolishStructuredProductNameSyncResult | null =>
  useMemo((): PolishStructuredProductNameSyncResult | null => {
    if (nameEn.trim() === '') return null;
    return syncPolishStructuredProductName({
      englishTitle: nameEn,
      polishTitle: namePl,
      previousGeneratedPolishTitle: refs.lastGeneratedPolishNameRef.current,
      syncPreviousGeneratedBaseName: refs.polishBaseNameAutoSyncRef.current,
      sizeTerms: terms.sizeTerms,
      materialTerms: terms.materialTerms,
      categories,
      themeTerms: terms.themeTerms,
    });
  }, [categories, nameEn, namePl, refs, terms]);

export function useDraftPolishNameAutoSync({
  categories,
  nameEn,
  namePl,
  primaryCatalogId,
  resetKey,
  setNamePl,
}: UseDraftPolishNameAutoSyncInput): void {
  const lastGeneratedPolishNameRef = useRef<string>('');
  const polishBaseNameAutoSyncRef = useRef<boolean>(true);
  const refs = useMemo<PolishNameAutoSyncRefs>(
    () => ({ lastGeneratedPolishNameRef, polishBaseNameAutoSyncRef }),
    []
  );
  const terms = useDraftPolishTitleTerms(primaryCatalogId);

  useEffect((): void => {
    lastGeneratedPolishNameRef.current = '';
    polishBaseNameAutoSyncRef.current = true;
  }, [resetKey]);

  useEffect((): void => {
    if (nameEn.trim() !== '' || namePl.trim() !== '') return;
    lastGeneratedPolishNameRef.current = '';
    polishBaseNameAutoSyncRef.current = true;
  }, [nameEn, namePl]);

  const generatedPolishName = useGeneratedDraftPolishName({
    categories,
    nameEn,
    namePl,
    refs,
    terms,
  });

  useEffect((): void => {
    if (generatedPolishName === null) return;
    const autoSyncStateUpdate = resolvePolishBaseNameAutoSyncStateUpdate({
      currentNamePl: namePl,
      syncResult: generatedPolishName,
    });
    if (autoSyncStateUpdate.generatedPolishTitle !== null) {
      refs.lastGeneratedPolishNameRef.current = autoSyncStateUpdate.generatedPolishTitle;
    }
    if (autoSyncStateUpdate.shouldDisableAutoSync) {
      refs.polishBaseNameAutoSyncRef.current = false;
    }
    if (namePl === generatedPolishName.polishTitle) return;
    setNamePl(generatedPolishName.polishTitle);
  }, [generatedPolishName, namePl, refs, setNamePl]);
}
