import type { ProductCategory } from '@/shared/contracts/products/categories';

import {
  coerceProductValidationNumericValue,
  getProductValidationFieldNumberMode,
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

const getCategoryDisplayCandidates = (category: ProductCategory | null): string[] => {
  if (!category) return [];
  return [category.name_en, category.name, category.name_pl, category.name_de]
    .map((value) => toTrimmedString(value))
    .filter((value) => value.length > 0);
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
  const fromCategory = getCategoryDisplayCandidates(category)[0] ?? '';
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
    const normalizedNumericValue = coerceProductValidationNumericValue(
      normalizedReplacement,
      getProductValidationFieldNumberMode(input.fieldName)
    );
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
