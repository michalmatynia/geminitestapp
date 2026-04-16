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

const resolveCategorySegment = (nameValue: string): string =>
  normalizeSegmentValue(nameValue.split('|')[3] ?? '');

const hasStructuredCategoryPrefix = (nameValue: string): boolean => {
  const segments = nameValue.split('|').map((segment: string) => normalizeSegmentValue(segment));
  return Boolean(segments[0] !== '' && segments[1] !== '' && segments[2] !== '');
};

// eslint-disable-next-line max-lines-per-function
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
  const previousSelectedCategoryIdRef = useRef<string | null>(null);
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

  // eslint-disable-next-line complexity
  useEffect((): void => {
    const categorySegment = resolveCategorySegment(nameValue);
    const previousSelectedCategoryId = previousSelectedCategoryIdRef.current;
    const selectedCategoryChanged = previousSelectedCategoryId !== selectedCategoryId;
    if (categorySegment === '' && selectedCategoryId !== null && selectedCategoryChanged === false) {
      setCategoryId(null);
      syncMappedCategoryField(null);
      return;
    }
    if (selectedCategoryOption?.value === categorySegment) {
      syncMappedCategoryField(selectedCategoryId);
      return;
    }
    const match = resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment);
    if (match?.categoryId !== undefined && match.categoryId !== selectedCategoryId) {
      setCategoryId(match.categoryId);
      syncMappedCategoryField(match.categoryId);
      return;
    }
    if (categorySegment !== '' && selectedCategoryId !== null && selectedCategoryChanged === false) {
      setCategoryId(null);
      syncMappedCategoryField(null);
    }
  }, [categorySuggestions, nameValue, selectedCategoryId, selectedCategoryOption, setCategoryId, syncMappedCategoryField]);

  useEffect((): void => {
    const previousSelectedCategoryId = previousSelectedCategoryIdRef.current;
    if (selectedCategoryOption === null || hasStructuredCategoryPrefix(nameValue) === false) return;
    const categorySegment = resolveCategorySegment(nameValue);
    if (categorySegment === selectedCategoryOption.value) return;
    if (resolveUniqueLeafCategorySuggestion(categorySuggestions, categorySegment)?.categoryId === selectedCategoryId) return;
    if (previousSelectedCategoryId === selectedCategoryId && categorySegment !== '') return;
    setValue(fieldName, replaceStructuredSegment(nameValue, CATEGORY_STAGE, selectedCategoryOption.value), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [categorySuggestions, fieldName, nameValue, selectedCategoryId, selectedCategoryOption, setValue]);

  useEffect((): void => {
    previousSelectedCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  return { categorySuggestions, selectedCategoryOption, syncMappedCategoryField };
}
