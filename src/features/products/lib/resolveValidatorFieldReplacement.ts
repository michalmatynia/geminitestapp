// resolveValidatorFieldReplacement: converts a raw replacement value into a
// typed replacement object (text | number | category). Handles numeric coercion
// and delegates category id resolution to resolveValidatorCategoryReplacement.
// Returns null for invalid or unparsable replacements.
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';

import {
  coerceProductValidationNumericValue,
  getProductValidationFieldNumberMode,
  getProductValidationFieldValueKind,
} from './validatorTargetAdapters';
import { resolveValidatorCategoryReplacementId } from './resolveValidatorCategoryReplacement';
import {
  formatProducerDisplayValue,
  resolveValidatorProducerReplacementIds,
} from './resolveValidatorProducerReplacement';

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

type ResolvedProducerValidatorFieldReplacement = {
  kind: 'producers';
  fieldName: 'producerIds';
  value: string[];
  comparableValue: string;
  displayValue: string;
};

export type ResolvedValidatorFieldReplacement =
  | ResolvedTextValidatorFieldReplacement
  | ResolvedNumericValidatorFieldReplacement
  | ResolvedCategoryValidatorFieldReplacement
  | ResolvedProducerValidatorFieldReplacement;

type ResolveValidatorFieldReplacementInput = {
  fieldName: string;
  replacementValue: string | null | undefined;
  categories?: ReadonlyArray<ProductCategory>;
  categoryNameById?: ReadonlyMap<string, string>;
  producers?: ReadonlyArray<Producer>;
  producerNameById?: ReadonlyMap<string, string>;
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
  if (fromMap.length > 0) return fromMap;

  const category = categories?.find((item) => toTrimmedString(item.id) === categoryId) ?? null;
  const fromCategory = getCategoryDisplayCandidates(category)[0] ?? '';
  if (fromCategory.length > 0) return fromCategory;

  return fallbackValue;
};

const resolveCategoryFieldReplacement = (
  input: ResolveValidatorFieldReplacementInput,
  normalizedReplacement: string
): ResolvedCategoryValidatorFieldReplacement | null => {
  const categoryId = resolveValidatorCategoryReplacementId(
    normalizedReplacement,
    [...(input.categories ?? [])]
  );
  if (categoryId === null) return null;

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
};

const resolveProducerFieldReplacement = (
  input: ResolveValidatorFieldReplacementInput,
  normalizedReplacement: string
): ResolvedProducerValidatorFieldReplacement | null => {
  const producerIds = resolveValidatorProducerReplacementIds(
    normalizedReplacement,
    input.producers
  );
  if (producerIds === null) return null;

  return {
    kind: 'producers',
    fieldName: 'producerIds',
    value: producerIds,
    comparableValue: producerIds.join(','),
    displayValue: formatProducerDisplayValue({
      producerIds,
      producers: input.producers,
      producerNameById: input.producerNameById,
      fallbackValue: normalizedReplacement,
    }),
  };
};

export const resolveValidatorFieldReplacement = (
  input: ResolveValidatorFieldReplacementInput
): ResolvedValidatorFieldReplacement | null => {
  const normalizedReplacement = toTrimmedString(input.replacementValue);
  if (normalizedReplacement.length === 0) return null;

  if (input.fieldName === 'categoryId') {
    return resolveCategoryFieldReplacement(input, normalizedReplacement);
  }

  if (input.fieldName === 'producerIds') {
    return resolveProducerFieldReplacement(input, normalizedReplacement);
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
