import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { Producer } from '@/shared/contracts/products/producers';
import { applyValidatorFieldReplacement } from '@/features/products/lib/applyValidatorFieldReplacement';
import {
  formatProducerDisplayValue,
  type buildProducerNameById,
} from '@/features/products/lib/resolveValidatorProducerReplacement';

import { toStringValue } from './validator-pattern-simulator.inputs';

type ApplySimulatorReplacementArgs = {
  categories: ProductCategory[];
  categoryNameById: Map<string, string>;
  fieldName: string;
  producers?: ReadonlyArray<Producer>;
  producerNameById: ReturnType<typeof buildProducerNameById>;
  replacementValue: string | null;
  values: Record<string, unknown>;
};

type ApplySimulatorReplacementResult = {
  applied: boolean;
  outputDisplayValue: string | null;
  outputValue: string | number | null;
};

const toNonEmptyDisplayValue = (value: string): string | null =>
  value.length > 0 ? value : null;

const resolveCategoryDisplayValue = (
  categoryId: string,
  categoryNameById: Map<string, string>
): string | null => {
  if (categoryId.length === 0) return null;
  return categoryNameById.get(categoryId) ?? categoryId;
};

const resolveProducerDisplayValue = ({
  fallbackValue,
  producerIds,
  producerNameById,
  producers,
}: {
  fallbackValue?: string;
  producerIds: string[];
  producerNameById?: ReturnType<typeof buildProducerNameById>;
  producers?: ReadonlyArray<Producer>;
}): string | null =>
  toNonEmptyDisplayValue(
    formatProducerDisplayValue({ fallbackValue, producerIds, producerNameById, producers })
  );

const resolveInitialDisplayValue = ({
  categoryNameById,
  fieldName,
  value,
}: {
  categoryNameById: Map<string, string>;
  fieldName: string;
  value: unknown;
}): string | null => {
  const stringValue = toStringValue(value);
  if (fieldName === 'categoryId') return resolveCategoryDisplayValue(stringValue, categoryNameById);
  if (fieldName === 'producerIds') {
    return resolveProducerDisplayValue({ fallbackValue: stringValue, producerIds: [] });
  }
  return toNonEmptyDisplayValue(stringValue);
};

export const applySimulatorReplacement = ({
  categories,
  categoryNameById,
  fieldName,
  producers,
  producerNameById,
  replacementValue,
  values,
}: ApplySimulatorReplacementArgs): ApplySimulatorReplacementResult => {
  const simulatedValues: Record<string, unknown> = { ...values };
  const result: ApplySimulatorReplacementResult = {
    applied: false,
    outputDisplayValue: resolveInitialDisplayValue({
      categoryNameById,
      fieldName,
      value: simulatedValues[fieldName],
    }),
    outputValue: toStringValue(simulatedValues[fieldName]),
  };
  result.applied = applyValidatorFieldReplacement({
    categories,
    categoryNameById,
    fieldName,
    getCurrentFieldValue: (nextFieldName) => simulatedValues[nextFieldName],
    producers,
    producerNameById,
    replacementValue,
    setCategoryId: (categoryId) => {
      const nextCategoryId = categoryId ?? '';
      simulatedValues['categoryId'] = nextCategoryId;
      result.outputValue = categoryId ?? null;
      result.outputDisplayValue = resolveCategoryDisplayValue(nextCategoryId, categoryNameById);
    },
    setFormFieldValue: (nextFieldName, value) => {
      simulatedValues[nextFieldName] = value;
      result.outputValue = typeof value === 'number' ? value : toStringValue(value);
      result.outputDisplayValue = toNonEmptyDisplayValue(toStringValue(value));
    },
    setProducerIds: (producerIds) => {
      simulatedValues['producerIds'] = producerIds;
      result.outputValue = resolveProducerDisplayValue({ producerIds, producerNameById, producers });
      result.outputDisplayValue =
        typeof result.outputValue === 'string' ? result.outputValue : null;
    },
  });
  return result;
};
