import type {
  ProductBatchEditFieldKind,
  ProductBatchEditMode,
  ProductBatchEditOperation,
} from '@/shared/contracts/products/batch-edit';

import {
  areValuesEqual,
  coerceBoolean,
  coerceJsonArray,
  coerceJsonObject,
  coerceNumber,
  coerceRequiredText,
  coerceStringArray,
  coerceText,
  compactString,
  isPlainRecord,
  normalizeEnumValue,
  uniqueValues,
} from './value-utils';

const assertNoAffix = (operation: ProductBatchEditOperation, label: string): void => {
  if (operation.mode === 'prepend' || operation.mode === 'append') {
    throw new Error(`${label} does not support ${operation.mode}.`);
  }
};

type OperationHandler<TResult> = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
) => TResult;

const textOperationHandlers: Record<ProductBatchEditMode, OperationHandler<string | null>> = {
  set: (_currentValue, operation) => coerceText(operation.value),
  remove: (currentValue, operation, label) => {
    if (operation.value === undefined || coerceText(operation.value) === null) return null;
    const current = typeof currentValue === 'string' ? currentValue : '';
    return compactString(current.split(coerceRequiredText(operation.value, label)).join(''));
  },
  prepend: (currentValue, operation, label) => {
    const current = typeof currentValue === 'string' ? currentValue : '';
    return compactString(`${coerceRequiredText(operation.value, label)}${current}`);
  },
  append: (currentValue, operation, label) => {
    const current = typeof currentValue === 'string' ? currentValue : '';
    return compactString(`${current}${coerceRequiredText(operation.value, label)}`);
  },
  replace: (currentValue, operation, label) => {
    const current = typeof currentValue === 'string' ? currentValue : '';
    const replacement = coerceText(operation.replaceWith) ?? '';
    return compactString(current.split(coerceRequiredText(operation.find, label)).join(replacement));
  },
};

const applyTextOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): string | null => textOperationHandlers[operation.mode](currentValue, operation, label);

const applyNumberOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): number => {
  assertNoAffix(operation, label);
  const current = typeof currentValue === 'number' && Number.isFinite(currentValue) ? currentValue : 0;
  if (operation.mode === 'set') return coerceNumber(operation.value, label);
  if (operation.mode === 'remove') return 0;
  if (operation.mode === 'replace') {
    return current === coerceNumber(operation.find, label)
      ? coerceNumber(operation.replaceWith, label)
      : current;
  }
  return current;
};

const applyBooleanOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): boolean => {
  assertNoAffix(operation, label);
  const current = currentValue === true;
  if (operation.mode === 'set') return coerceBoolean(operation.value, label);
  if (operation.mode === 'remove') return false;
  if (operation.mode === 'replace') {
    return current === coerceBoolean(operation.find, label)
      ? coerceBoolean(operation.replaceWith, label)
      : current;
  }
  return current;
};

const applyEnumOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): string | null => {
  assertNoAffix(operation, label);
  const current = normalizeEnumValue(currentValue, label);
  if (operation.mode === 'set') return normalizeEnumValue(operation.value, label);
  if (operation.mode === 'remove') return null;
  if (operation.mode === 'replace') {
    return current === normalizeEnumValue(operation.find, label)
      ? normalizeEnumValue(operation.replaceWith, label)
      : current;
  }
  return current;
};

const applyStringArrayOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): string[] => {
  const current = Array.isArray(currentValue) ? coerceStringArray(currentValue, label) : [];
  if (operation.mode === 'set') return coerceStringArray(operation.value, label);
  if (operation.mode === 'remove') {
    if (operation.value === undefined) return [];
    const targets = new Set(coerceStringArray(operation.value, label));
    return current.filter((entry) => !targets.has(entry));
  }
  if (operation.mode === 'prepend') {
    return uniqueValues([...coerceStringArray(operation.value, label), ...current]);
  }
  if (operation.mode === 'append') {
    return uniqueValues([...current, ...coerceStringArray(operation.value, label)]);
  }
  const findValues = coerceStringArray(operation.find, label);
  const replacement = coerceStringArray(operation.replaceWith, label);
  return uniqueValues(current.flatMap((entry) => (findValues.includes(entry) ? replacement : [entry])));
};

const applyJsonArrayOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): unknown[] => {
  const current: unknown[] = Array.isArray(currentValue) ? currentValue : [];
  if (operation.mode === 'set') return coerceJsonArray(operation.value, label);
  if (operation.mode === 'remove') {
    if (operation.value === undefined) return [];
    const targets = coerceJsonArray(operation.value, label);
    return current.filter((entry) => !targets.some((target) => areValuesEqual(entry, target)));
  }
  if (operation.mode === 'prepend') return uniqueValues([...coerceJsonArray(operation.value, label), ...current]);
  if (operation.mode === 'append') return uniqueValues([...current, ...coerceJsonArray(operation.value, label)]);
  const targets = coerceJsonArray(operation.find, label);
  const replacement = coerceJsonArray(operation.replaceWith, label);
  return uniqueValues(
    current.flatMap((entry) =>
      targets.some((target) => areValuesEqual(entry, target)) ? replacement : [entry]
    )
  );
};

const applyJsonObjectOperation = (
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): Record<string, unknown> | null => {
  assertNoAffix(operation, label);
  const current = isPlainRecord(currentValue) ? currentValue : null;
  if (operation.mode === 'set') return coerceJsonObject(operation.value, label) ?? {};
  if (operation.mode === 'remove') return {};
  if (operation.mode === 'replace') {
    const target = coerceJsonObject(operation.find, label);
    return areValuesEqual(current, target) ? coerceJsonObject(operation.replaceWith, label) ?? {} : current;
  }
  return current;
};

type KindHandler = OperationHandler<unknown>;

const kindHandlers: Record<ProductBatchEditFieldKind, KindHandler> = {
  text: applyTextOperation,
  'localized-text': applyTextOperation,
  number: applyNumberOperation,
  boolean: applyBooleanOperation,
  enum: applyEnumOperation,
  'string-array': applyStringArrayOperation,
  'json-array': applyJsonArrayOperation,
  'json-object': applyJsonObjectOperation,
};

export const applyOperationByKind = (
  kind: ProductBatchEditFieldKind,
  currentValue: unknown,
  operation: ProductBatchEditOperation,
  label: string
): unknown => kindHandlers[kind](currentValue, operation, label);
