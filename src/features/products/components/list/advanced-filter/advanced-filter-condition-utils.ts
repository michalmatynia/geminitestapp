import type {
  ProductAdvancedFilterCondition,
  ProductAdvancedFilterField,
  ProductAdvancedFilterOperator,
} from '@/shared/contracts/products';

import {
  type AdvancedFieldKind,
  getFieldConfig,
  getDefaultOperatorForField,
  isMultiValueOperator,
  isSecondValueRequired,
  isValueRequired,
  normalizeConditionValue,
  normalizeMultiValueInput,
  supportsOperator,
} from './advanced-filter-fields';
import {
  stripConditionValue,
  stripConditionValueTo,
  stripConditionValues,
} from './advanced-filter-rules';

const isBlankString = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length === 0;

const isMissingValue = (value: unknown): boolean =>
  value === undefined || value === null || isBlankString(value);

const validateSingleValue = (
  condition: ProductAdvancedFilterCondition,
  valueKind: AdvancedFieldKind
): string | null => {
  if (isMissingValue(condition.value)) return 'Value is required.';
  if (Array.isArray(condition.value)) return 'Value must be a single item.';
  if (
    valueKind === 'number' &&
    (typeof condition.value !== 'number' || !Number.isFinite(condition.value))
  ) {
    return 'Value must be a number.';
  }
  if (valueKind === 'boolean' && typeof condition.value !== 'boolean') {
    return 'Value must be true or false.';
  }
  return null;
};

const validateScalarSecondValue = (
  value: ProductAdvancedFilterCondition['valueTo'],
  valueKind: AdvancedFieldKind
): string | null => {
  if (isMissingValue(value)) return 'Second value is required.';
  if (Array.isArray(value)) return 'Second value must be a single item.';
  if (valueKind === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
    return 'Second value must be a number.';
  }
  if (valueKind === 'boolean' && typeof value !== 'boolean') {
    return 'Second value must be true or false.';
  }
  return null;
};

const validateSecondValue = (
  condition: ProductAdvancedFilterCondition,
  valueKind: AdvancedFieldKind
): string | null => {
  if (!isSecondValueRequired(condition.operator)) return null;
  return validateScalarSecondValue(condition.valueTo, valueKind);
};

const validateMultiValue = (
  condition: ProductAdvancedFilterCondition,
  valueKind: AdvancedFieldKind
): string | null => {
  if (!Array.isArray(condition.value) || condition.value.length === 0) {
    return 'At least one value is required.';
  }
  const hasInvalidNumber = condition.value.some(
    (value) => typeof value !== 'number' || !Number.isFinite(value)
  );
  if (valueKind === 'number' && hasInvalidNumber) return 'All values must be numbers.';
  return null;
};

export const buildConditionValidationMessage = (
  condition: ProductAdvancedFilterCondition
): string | null => {
  if (!isValueRequired(condition.operator)) return null;

  const valueKind = getFieldConfig(condition.field).kind;
  if (isMultiValueOperator(condition.operator)) {
    return validateMultiValue(condition, valueKind);
  }

  return validateSingleValue(condition, valueKind) ?? validateSecondValue(condition, valueKind);
};

export const buildConditionForFieldChange = (
  condition: ProductAdvancedFilterCondition,
  nextField: ProductAdvancedFilterField
): ProductAdvancedFilterCondition => {
  const nextOperator = supportsOperator(nextField, condition.operator)
    ? condition.operator
    : getDefaultOperatorForField(nextField);

  return stripConditionValues({
    ...condition,
    field: nextField,
    operator: nextOperator,
  });
};

const buildConditionForMultiValueOperator = (
  condition: ProductAdvancedFilterCondition
): ProductAdvancedFilterCondition => {
  if (Array.isArray(condition.value)) return stripConditionValueTo(condition);
  if (isMissingValue(condition.value)) {
    return stripConditionValueTo(stripConditionValue(condition));
  }
  return stripConditionValueTo({
    ...condition,
    value: [condition.value],
  });
};

const buildConditionForSingleValueOperator = (
  condition: ProductAdvancedFilterCondition,
  nextOperator: ProductAdvancedFilterOperator
): ProductAdvancedFilterCondition => {
  let nextCondition = condition;
  if (Array.isArray(nextCondition.value)) {
    const firstValue = nextCondition.value[0];
    nextCondition =
      firstValue === undefined
        ? stripConditionValue(nextCondition)
        : { ...nextCondition, value: firstValue };
  }
  return isSecondValueRequired(nextOperator) ? nextCondition : stripConditionValueTo(nextCondition);
};

export const buildConditionForOperatorChange = (
  condition: ProductAdvancedFilterCondition,
  nextOperator: ProductAdvancedFilterOperator
): ProductAdvancedFilterCondition => {
  const nextCondition: ProductAdvancedFilterCondition = {
    ...condition,
    operator: nextOperator,
  };

  if (!isValueRequired(nextOperator)) return stripConditionValues(nextCondition);
  if (isMultiValueOperator(nextOperator)) {
    return buildConditionForMultiValueOperator(nextCondition);
  }
  return buildConditionForSingleValueOperator(nextCondition, nextOperator);
};

export const buildConditionForValueChange = (
  condition: ProductAdvancedFilterCondition,
  kind: AdvancedFieldKind,
  rawValue: string
): ProductAdvancedFilterCondition => {
  if (isMultiValueOperator(condition.operator)) {
    const normalized = normalizeMultiValueInput(kind, rawValue);
    return normalized.length === 0
      ? stripConditionValue(condition)
      : { ...condition, value: normalized };
  }

  if (rawValue.length === 0) return stripConditionValue(condition);

  return {
    ...condition,
    value: normalizeConditionValue(kind, rawValue),
  };
};

export const buildConditionForBooleanValueChange = (
  condition: ProductAdvancedFilterCondition,
  nextValue: string
): ProductAdvancedFilterCondition => {
  if (nextValue.length === 0) return stripConditionValue(condition);
  return {
    ...condition,
    value: nextValue === 'true',
  };
};

export const buildConditionForValueToChange = (
  condition: ProductAdvancedFilterCondition,
  kind: AdvancedFieldKind,
  rawValue: string
): ProductAdvancedFilterCondition => {
  if (rawValue.length === 0) return stripConditionValueTo(condition);
  return {
    ...condition,
    valueTo: normalizeConditionValue(kind, rawValue),
  };
};
