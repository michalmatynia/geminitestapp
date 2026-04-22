import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';
import type { ProductFormData } from '@/shared/contracts/products/drafts';

import {
  resolveValidatorFieldReplacement,
  type ResolvedValidatorFieldReplacement,
} from './resolveValidatorFieldReplacement';

type ValidatorFieldReplacementApplyApi = {
  getCurrentFieldValue: (fieldName: keyof ProductFormData) => unknown;
  setFormFieldValue: (
    fieldName: keyof ProductFormData,
    value: ProductFormData[keyof ProductFormData]
  ) => void;
  setCategoryId: (categoryId: string | null) => void;
  setProducerIds: (producerIds: string[]) => void;
};

type ApplyResolvedValidatorFieldReplacementInput = ValidatorFieldReplacementApplyApi & {
  resolvedReplacement: ResolvedValidatorFieldReplacement;
};

type ApplyValidatorFieldReplacementInput = ValidatorFieldReplacementApplyApi & {
  fieldName: string;
  replacementValue: string | null | undefined;
  categories?: ReadonlyArray<ProductCategory>;
  categoryNameById?: ReadonlyMap<string, string>;
  producers?: ReadonlyArray<Producer>;
  producerNameById?: ReadonlyMap<string, string>;
};

const toComparableFieldString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const toComparableStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .sort()
    )
  );
};

const areComparableStringListsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const applyResolvedValidatorFieldReplacement = (
  input: ApplyResolvedValidatorFieldReplacementInput
): boolean => {
  const {
    resolvedReplacement,
    getCurrentFieldValue,
    setFormFieldValue,
    setCategoryId,
    setProducerIds,
  } = input;

  if (resolvedReplacement.kind === 'category') {
    const currentCategoryValue = toComparableFieldString(getCurrentFieldValue('categoryId'));
    if (currentCategoryValue !== resolvedReplacement.comparableValue) {
      setCategoryId(resolvedReplacement.value);
    }
    return true;
  }

  if (resolvedReplacement.kind === 'number') {
    const formFieldName = resolvedReplacement.fieldName as keyof ProductFormData;
    const currentNumeric = getCurrentFieldValue(formFieldName);
    if (
      typeof currentNumeric !== 'number' ||
      !Number.isFinite(currentNumeric) ||
      currentNumeric !== resolvedReplacement.value
    ) {
      setFormFieldValue(formFieldName, resolvedReplacement.value);
    }
    return true;
  }

  if (resolvedReplacement.kind === 'producers') {
    const currentProducerIds = toComparableStringList(getCurrentFieldValue('producerIds'));
    const nextProducerIds = Array.from(new Set(resolvedReplacement.value.slice().sort()));
    if (!areComparableStringListsEqual(currentProducerIds, nextProducerIds)) {
      setProducerIds(resolvedReplacement.value);
    }
    return true;
  }

  const formFieldName = resolvedReplacement.fieldName as keyof ProductFormData;
  const currentValue = toComparableFieldString(getCurrentFieldValue(formFieldName));
  if (currentValue !== resolvedReplacement.comparableValue) {
    setFormFieldValue(formFieldName, resolvedReplacement.value);
  }
  return true;
};

export const doesResolvedValidatorFieldReplacementMatchCurrentValue = ({
  resolvedReplacement,
  getCurrentFieldValue,
}: Pick<ApplyResolvedValidatorFieldReplacementInput, 'resolvedReplacement' | 'getCurrentFieldValue'>): boolean => {
  if (resolvedReplacement.kind === 'category') {
    const currentCategoryValue = toComparableFieldString(getCurrentFieldValue('categoryId'));
    return currentCategoryValue === resolvedReplacement.comparableValue;
  }

  if (resolvedReplacement.kind === 'number') {
    const currentNumeric = getCurrentFieldValue(
      resolvedReplacement.fieldName as keyof ProductFormData
    );
    return (
      typeof currentNumeric === 'number' &&
      Number.isFinite(currentNumeric) &&
      currentNumeric === resolvedReplacement.value
    );
  }

  if (resolvedReplacement.kind === 'producers') {
    const currentProducerIds = toComparableStringList(getCurrentFieldValue('producerIds'));
    const nextProducerIds = Array.from(new Set(resolvedReplacement.value.slice().sort()));
    return areComparableStringListsEqual(currentProducerIds, nextProducerIds);
  }

  const currentValue = toComparableFieldString(
    getCurrentFieldValue(resolvedReplacement.fieldName as keyof ProductFormData)
  );
  return currentValue === resolvedReplacement.comparableValue;
};

export const applyValidatorFieldReplacement = (
  input: ApplyValidatorFieldReplacementInput
): boolean => {
  const {
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
    producers,
    producerNameById,
    getCurrentFieldValue,
    setFormFieldValue,
    setCategoryId,
    setProducerIds,
  } = input;

  const resolvedReplacement = resolveValidatorFieldReplacement({
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
    producers,
    producerNameById,
  });
  if (!resolvedReplacement) return false;

  return applyResolvedValidatorFieldReplacement({
    resolvedReplacement,
    getCurrentFieldValue,
    setFormFieldValue,
    setCategoryId,
    setProducerIds,
  });
};

export const doesValidatorFieldReplacementMatchCurrentValue = (
  input: ApplyValidatorFieldReplacementInput
): boolean => {
  const {
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
    producers,
    producerNameById,
    getCurrentFieldValue,
  } = input;

  const resolvedReplacement = resolveValidatorFieldReplacement({
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
    producers,
    producerNameById,
  });
  if (!resolvedReplacement) return false;

  return doesResolvedValidatorFieldReplacementMatchCurrentValue({
    resolvedReplacement,
    getCurrentFieldValue,
  });
};
