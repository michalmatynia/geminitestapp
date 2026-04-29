import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { StructuredProductTitleLocale } from '@/shared/lib/products/title-terms';

import {
  buildCategorySuggestions,
  normalizeSegmentValue,
  replaceStructuredSegment,
  resolveUniqueLeafCategorySuggestion,
} from './StructuredProductNameField.suggestions';
import { CATEGORY_STAGE, type SuggestionOption } from './StructuredProductNameField.types';

type UseStructuredProductCategorySyncArgs = {
  categories: ProductCategory[];
  fieldName: 'name_en' | 'name_pl';
  locale: StructuredProductTitleLocale;
  nameValue: string;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
};

type UseStructuredProductCategorySyncResult = {
  categorySuggestions: SuggestionOption[];
  selectedCategoryOption: SuggestionOption | null;
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
};

type CategorySegmentSyncAction =
  | { type: 'none' }
  | { type: 'clear' }
  | { type: 'sync'; categoryId: string | null }
  | { type: 'select'; categoryId: string };

const resolveCategorySegment = (nameValue: string): string =>
  normalizeSegmentValue(nameValue.split('|')[3] ?? '');

const hasStructuredCategoryPrefix = (nameValue: string): boolean => {
  const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
  return Boolean(segments[0] !== '' && segments[1] !== '' && segments[2] !== '');
};

const shouldClearCategorySegment = ({
  categorySegment,
  selectedCategoryId,
  selectedCategoryChanged,
}: {
  categorySegment: string;
  selectedCategoryId: string | null;
  selectedCategoryChanged: boolean;
}): boolean =>
  categorySegment === '' && selectedCategoryId !== null && selectedCategoryChanged === false;

const shouldClearUnmatchedCategorySegment = ({
  categorySegment,
  selectedCategoryId,
  selectedCategoryChanged,
}: {
  categorySegment: string;
  selectedCategoryId: string | null;
  selectedCategoryChanged: boolean;
}): boolean =>
  categorySegment !== '' && selectedCategoryId !== null && selectedCategoryChanged === false;

const resolveCategorySegmentSyncAction = ({
  categorySuggestions,
  categorySegment,
  selectedCategoryId,
  selectedCategoryOption,
  selectedCategoryChanged,
}: {
  categorySuggestions: SuggestionOption[];
  categorySegment: string;
  selectedCategoryId: string | null;
  selectedCategoryOption: SuggestionOption | null;
  selectedCategoryChanged: boolean;
}): CategorySegmentSyncAction => {
  if (shouldClearCategorySegment({ categorySegment, selectedCategoryId, selectedCategoryChanged })) {
    return { type: 'clear' };
  }
  if (selectedCategoryOption?.value === categorySegment) {
    return { type: 'sync', categoryId: selectedCategoryId };
  }

  const match = resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment);
  if (match?.categoryId !== undefined && match.categoryId !== selectedCategoryId) {
    return { type: 'select', categoryId: match.categoryId };
  }
  if (
    shouldClearUnmatchedCategorySegment({ categorySegment, selectedCategoryId, selectedCategoryChanged })
  ) {
    return { type: 'clear' };
  }
  return { type: 'none' };
};

const applyCategorySegmentSyncAction = ({
  action,
  setCategoryId,
  syncMappedCategoryField,
}: {
  action: CategorySegmentSyncAction;
  setCategoryId: (categoryId: string | null) => void;
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
}): void => {
  if (action.type === 'none') return;
  if (action.type === 'sync') {
    syncMappedCategoryField(action.categoryId);
    return;
  }

  const nextCategoryId = action.type === 'select' ? action.categoryId : null;
  setCategoryId(nextCategoryId);
  syncMappedCategoryField(nextCategoryId);
};

const shouldReplaceStructuredCategorySegment = ({
  categorySuggestions,
  categorySegment,
  nameValue,
  previousSelectedCategoryId,
  selectedCategoryId,
  selectedCategoryOption,
}: {
  categorySuggestions: SuggestionOption[];
  categorySegment: string;
  nameValue: string;
  previousSelectedCategoryId: string | null;
  selectedCategoryId: string | null;
  selectedCategoryOption: SuggestionOption;
}): boolean => {
  if (hasStructuredCategoryPrefix(nameValue) === false) return false;
  if (categorySegment === selectedCategoryOption.value) return false;
  const matchedCategoryId =
    resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment)?.categoryId ?? null;
  if (matchedCategoryId === selectedCategoryId) return false;
  return previousSelectedCategoryId !== selectedCategoryId || categorySegment === '';
};

const usePreviousCategoryIdRef = (
  selectedCategoryId: string | null
): ReturnType<typeof useRef<string | null>> => {
  const previousSelectedCategoryIdRef = useRef<string | null>(null);
  useEffect((): void => {
    previousSelectedCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId]);
  return previousSelectedCategoryIdRef;
};

const useAutoSyncCategorySegment = ({
  categorySuggestions,
  nameValue,
  previousSelectedCategoryId,
  selectedCategoryId,
  selectedCategoryOption,
  setCategoryId,
  syncMappedCategoryField,
}: {
  categorySuggestions: SuggestionOption[];
  nameValue: string;
  previousSelectedCategoryId: string | null;
  selectedCategoryId: string | null;
  selectedCategoryOption: SuggestionOption | null;
  setCategoryId: (categoryId: string | null) => void;
  syncMappedCategoryField: (nextCategoryId: string | null) => void;
}): void => {
  useEffect((): void => {
    const categorySegment = resolveCategorySegment(nameValue);
    const action = resolveCategorySegmentSyncAction({
      categorySuggestions,
      categorySegment,
      selectedCategoryId,
      selectedCategoryOption,
      selectedCategoryChanged: previousSelectedCategoryId !== selectedCategoryId,
    });
    applyCategorySegmentSyncAction({ action, setCategoryId, syncMappedCategoryField });
  }, [
    categorySuggestions,
    nameValue,
    previousSelectedCategoryId,
    selectedCategoryId,
    selectedCategoryOption,
    setCategoryId,
    syncMappedCategoryField,
  ]);
};

const useStructuredCategorySegmentReplacement = ({
  categorySuggestions,
  fieldName,
  nameValue,
  previousSelectedCategoryId,
  selectedCategoryId,
  selectedCategoryOption,
  setValue,
}: {
  categorySuggestions: SuggestionOption[];
  fieldName: 'name_en' | 'name_pl';
  nameValue: string;
  previousSelectedCategoryId: string | null;
  selectedCategoryId: string | null;
  selectedCategoryOption: SuggestionOption | null;
  setValue: UseFormSetValue<ProductFormData>;
}): void => {
  useEffect((): void => {
    if (selectedCategoryOption === null) return;

    const categorySegment = resolveCategorySegment(nameValue);
    if (
      shouldReplaceStructuredCategorySegment({
        categorySuggestions,
        categorySegment,
        nameValue,
        previousSelectedCategoryId,
        selectedCategoryId,
        selectedCategoryOption,
      }) === false
    ) {
      return;
    }
    setValue(fieldName, replaceStructuredSegment(nameValue, CATEGORY_STAGE, selectedCategoryOption.value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [
    categorySuggestions,
    fieldName,
    nameValue,
    previousSelectedCategoryId,
    selectedCategoryId,
    selectedCategoryOption,
    setValue,
  ]);
};

export function useStructuredProductCategorySync({
  categories,
  fieldName,
  locale,
  nameValue,
  selectedCategoryId,
  setCategoryId,
  getValues,
  setValue,
}: UseStructuredProductCategorySyncArgs): UseStructuredProductCategorySyncResult {
  const previousSelectedCategoryIdRef = usePreviousCategoryIdRef(selectedCategoryId);
  const categorySuggestions = useMemo(
    () => buildCategorySuggestions(categories, locale),
    [categories, locale]
  );
  const selectedCategoryOption = useMemo(
    () => categorySuggestions.find((option) => option.categoryId === selectedCategoryId) ?? null,
    [categorySuggestions, selectedCategoryId]
  );
  const syncMappedCategoryField = useCallback(
    (nextCategoryId: string | null): void => {
      const nextId = typeof nextCategoryId === 'string' ? nextCategoryId.trim() : '';
      const currentValue = getValues('categoryId');
      const currentId = typeof currentValue === 'string' ? currentValue.trim() : '';
      if (currentId === nextId) return;
      setValue('categoryId', nextId, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    },
    [getValues, setValue]
  );

  useAutoSyncCategorySegment({
    categorySuggestions,
    nameValue,
    previousSelectedCategoryId: previousSelectedCategoryIdRef.current,
    selectedCategoryId,
    selectedCategoryOption,
    setCategoryId,
    syncMappedCategoryField,
  });
  useStructuredCategorySegmentReplacement({
    categorySuggestions,
    fieldName,
    nameValue,
    previousSelectedCategoryId: previousSelectedCategoryIdRef.current,
    selectedCategoryId,
    selectedCategoryOption,
    setValue,
  });

  return { categorySuggestions, selectedCategoryOption, syncMappedCategoryField };
}
