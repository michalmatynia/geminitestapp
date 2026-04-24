'use client';

import { useEffect } from 'react';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { validateNormalizedProductName } from '@/features/products/lib/validateNormalizedProductName';

import type { NormalizeCompletionState } from '../components/ProductModals.types';

export function useProductNormalizeEffect(args: {
  shouldApplyNormalizeResultLocally: boolean;
  pendingNormalizeCompletion: NormalizeCompletionState | null;
  onNormalizeCompletionHandled: (runId: string) => void;
}): void {
  const { shouldApplyNormalizeResultLocally, pendingNormalizeCompletion, onNormalizeCompletionHandled } = args;
  const { setValue, setNormalizeNameError } = useProductFormCore();
  const { categories } = useProductFormMetadata();

  useEffect(() => {
    if (pendingNormalizeCompletion === null || shouldApplyNormalizeResultLocally === false) return;
    const completionRunId = pendingNormalizeCompletion.runId;
    try {
      if (pendingNormalizeCompletion.kind === 'error') {
        setNormalizeNameError(pendingNormalizeCompletion.error);
        return;
      }
      const normalizeResult = pendingNormalizeCompletion.result;
      if (normalizeResult.isValid === false) {
        setNormalizeNameError(
          normalizeResult.validationError ??
            'Normalize failed: the AI Path returned an invalid normalized title.'
        );
        return;
      }
      const normalizedName = normalizeResult.normalizedName;
      if (normalizedName === null || normalizedName === undefined) {
        setNormalizeNameError(
          normalizeResult.validationError ??
            'Normalize failed: the AI Path did not return a normalized English title.'
        );
        return;
      }
      const validation = validateNormalizedProductName({
        normalizedName,
        categories,
        categoryHint: normalizeResult.category,
        categoryContext: normalizeResult.categoryContext,
      });
      if (validation.isValid === false) {
        setNormalizeNameError(validation.error);
        return;
      }
      setNormalizeNameError(null);
      setValue('name_en', validation.normalizedName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } finally {
      onNormalizeCompletionHandled(completionRunId);
    }
  }, [
    categories,
    onNormalizeCompletionHandled,
    pendingNormalizeCompletion,
    setNormalizeNameError,
    setValue,
    shouldApplyNormalizeResultLocally,
  ]);
}
