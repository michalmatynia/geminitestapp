import type { ProductCategory } from '@/shared/contracts/products/categories';
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
};

type ApplyResolvedValidatorFieldReplacementInput = ValidatorFieldReplacementApplyApi & {
  resolvedReplacement: ResolvedValidatorFieldReplacement;
};

type ApplyValidatorFieldReplacementInput = ValidatorFieldReplacementApplyApi & {
  fieldName: string;
  replacementValue: string | null | undefined;
  categories?: ReadonlyArray<ProductCategory>;
  categoryNameById?: ReadonlyMap<string, string>;
};

const toComparableFieldString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

export const applyResolvedValidatorFieldReplacement = (
  input: ApplyResolvedValidatorFieldReplacementInput
): boolean => {
  const { resolvedReplacement, getCurrentFieldValue, setFormFieldValue, setCategoryId } = input;

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
    getCurrentFieldValue,
    setFormFieldValue,
    setCategoryId,
  } = input;

  const resolvedReplacement = resolveValidatorFieldReplacement({
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
  });
  if (!resolvedReplacement) return false;

  return applyResolvedValidatorFieldReplacement({
    resolvedReplacement,
    getCurrentFieldValue,
    setFormFieldValue,
    setCategoryId,
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
    getCurrentFieldValue,
  } = input;

  const resolvedReplacement = resolveValidatorFieldReplacement({
    fieldName,
    replacementValue,
    categories,
    categoryNameById,
  });
  if (!resolvedReplacement) return false;

  return doesResolvedValidatorFieldReplacementMatchCurrentValue({
    resolvedReplacement,
    getCurrentFieldValue,
  });
};
