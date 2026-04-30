'use client';

import { useCallback } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import {
  applyValidatorFieldReplacement,
  doesValidatorFieldReplacementMatchCurrentValue,
} from '@/features/products/lib/applyValidatorFieldReplacement';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { Producer } from '@/shared/contracts/products/producers';

type UseProductFormValidatorReplacementsArgs = {
  categories: ProductCategory[];
  getValues: UseFormGetValues<ProductFormData>;
  producers: Producer[];
  selectedProducerIds: string[];
  setCategoryId: (categoryId: string | null) => void;
  setProducerIds: (producerIds: string[]) => void;
  setValue: UseFormSetValue<ProductFormData>;
};

export type ProductFormValidatorReplacements = {
  applyAutoReplacementToField: (fieldName: string, value: string) => boolean;
  doesAutoReplacementMatchField: (fieldName: string, value: string) => boolean;
};

export const useProductFormValidatorReplacements = ({
  categories,
  getValues,
  producers,
  selectedProducerIds,
  setCategoryId,
  setProducerIds,
  setValue,
}: UseProductFormValidatorReplacementsArgs): ProductFormValidatorReplacements => {
  const getCurrentFieldValue = useCallback(
    (nextFieldName: keyof ProductFormData): unknown =>
      nextFieldName === 'producerIds' ? selectedProducerIds : getValues(nextFieldName),
    [getValues, selectedProducerIds]
  );
  const applyAutoReplacementToField = useCallback(
    (fieldName: string, value: string): boolean =>
      applyValidatorFieldReplacement({
        categories,
        fieldName,
        getCurrentFieldValue,
        producers,
        replacementValue: value,
        setCategoryId,
        setFormFieldValue: (nextFieldName, nextValue) => {
          setValue(nextFieldName, nextValue, { shouldDirty: true, shouldTouch: true });
        },
        setProducerIds,
      }),
    [categories, getCurrentFieldValue, producers, setCategoryId, setProducerIds, setValue]
  );
  const doesAutoReplacementMatchField = useCallback(
    (fieldName: string, value: string): boolean =>
      doesValidatorFieldReplacementMatchCurrentValue({
        categories,
        fieldName,
        getCurrentFieldValue,
        producers,
        replacementValue: value,
        setCategoryId: () => {},
        setFormFieldValue: () => {},
        setProducerIds: () => {},
      }),
    [categories, getCurrentFieldValue, producers]
  );

  return { applyAutoReplacementToField, doesAutoReplacementMatchField };
};
