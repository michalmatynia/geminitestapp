import type { ProductCategory } from '@/shared/contracts/products';

import {
  coerceProductValidationNumericValue,
  getProductValidationFieldValueKind,
} from './validatorTargetAdapters';
import { resolveValidatorCategoryReplacementId } from './resolveValidatorCategoryReplacement';

type ResolvedTextValidatorFieldReplacement = {
  kind: 'text';
  fieldName: string;
  value: string;
  comparableValue: string;
  displayValue: string;
};

type ResolvedNumericValidatorFieldReplacement = {
  kind: 'number';
  fieldName: string;
  value: number;
  comparableValue: string;
  displayValue: string;
};

type ResolvedCategoryValidatorFieldReplacement = {
  kind: 'category';
  fieldName: 'categoryId';
  value: string;
  comparableValue: string;
  displayValue: string;
};

export type ResolvedValidatorFieldReplacement =
  | ResolvedTextValidatorFieldReplacement
  | ResolvedNumericValidatorFieldReplacement
  | ResolvedCategoryValidatorFieldReplacement;

type ResolveValidatorFieldReplacementInput = {
  fieldName: string;
  replacementValue: string | null | undefined;
  categories?: ReadonlyArray<ProductCategory>;
  categoryNameById?: ReadonlyMap<string, string>;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const resolveCategoryDisplayValue = (
  categoryId: string,
  categories: ReadonlyArray<ProductCategory> | undefined,
  categoryNameById: ReadonlyMap<string, string> | undefined,
  fallbackValue: string
): string => {
  const fromMap = toTrimmedString(categoryNameById?.get(categoryId));
  if (fromMap) return fromMap;

  const category = categories?.find((item) => toTrimmedString(item.id) === categoryId) ?? null;
  const fromCategory = toTrimmedString(category?.name);
  if (fromCategory) return fromCategory;

  return fallbackValue;
};

export const resolveValidatorFieldReplacement = (
  input: ResolveValidatorFieldReplacementInput
): ResolvedValidatorFieldReplacement | null => {
  const normalizedReplacement = toTrimmedString(input.replacementValue);
  if (!normalizedReplacement) return null;

  if (input.fieldName === 'categoryId') {
    const categoryId = resolveValidatorCategoryReplacementId(
      normalizedReplacement,
      [...(input.categories ?? [])]
    );
    if (!categoryId) return null;

    return {
      kind: 'category',
      fieldName: 'categoryId',
      value: categoryId,
      comparableValue: categoryId,
      displayValue: resolveCategoryDisplayValue(
        categoryId,
        input.categories,
        input.categoryNameById,
        normalizedReplacement
      ),
    };
  }

  if (getProductValidationFieldValueKind(input.fieldName) === 'number') {
    const normalizedNumericValue = coerceProductValidationNumericValue(normalizedReplacement);
    if (normalizedNumericValue === null || !Number.isFinite(normalizedNumericValue)) return null;
    return {
      kind: 'number',
      fieldName: input.fieldName,
      value: normalizedNumericValue,
      comparableValue: String(normalizedNumericValue),
      displayValue: String(normalizedNumericValue),
    };
  }

  return {
    kind: 'text',
    fieldName: input.fieldName,
    value: normalizedReplacement,
    comparableValue: normalizedReplacement,
    displayValue: normalizedReplacement,
  };
};
