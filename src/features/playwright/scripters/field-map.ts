import { evaluatePath, evaluatePaths } from './path';
import {
  applyTransforms,
  BUILTIN_TRANSFORMS,
  type TransformRegistry,
} from './transforms';
import type {
  FieldBinding,
  FieldMap,
  FieldMapEvaluation,
  FieldMapIssue,
  FieldMapTargetField,
  MappedScripterRecord,
} from './types';

const EMPTY_RECORD: MappedScripterRecord = {
  title: null,
  description: null,
  price: null,
  currency: null,
  images: [],
  sku: null,
  ean: null,
  brand: null,
  category: null,
  sourceUrl: null,
  externalId: null,
  raw: {},
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '.');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringOrNull(item))
      .filter((item): item is string => item !== null);
  }
  const single = toStringOrNull(value);
  return single ? [single] : [];
};

const coerceForTarget = (
  field: FieldMapTargetField,
  value: unknown
): MappedScripterRecord[FieldMapTargetField] => {
  switch (field) {
    case 'price':
      return toNumberOrNull(value);
    case 'images':
      return toStringArray(value);
    default:
      return toStringOrNull(value);
  }
};

const resolveBindingSource = (binding: FieldBinding, raw: unknown): { value: unknown; path: string | undefined } => {
  if (binding.constant !== undefined) return { value: binding.constant, path: undefined };
  if (binding.paths && binding.paths.length > 0) {
    return { value: evaluatePaths(raw, binding.paths), path: binding.paths.join('|') };
  }
  if (binding.path) return { value: evaluatePath(raw, binding.path), path: binding.path };
  return { value: undefined, path: undefined };
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const evaluateFieldMap = (
  raw: Record<string, unknown>,
  fieldMap: FieldMap,
  registry: TransformRegistry = BUILTIN_TRANSFORMS
): FieldMapEvaluation => {
  const record: MappedScripterRecord = { ...EMPTY_RECORD, images: [], raw };
  const issues: FieldMapIssue[] = [];

  for (const [targetField, binding] of Object.entries(fieldMap.bindings) as Array<
    [FieldMapTargetField, FieldBinding]
  >) {
    const { value: sourceValue, path } = resolveBindingSource(binding, raw);
    const { value: transformed, missing } = applyTransforms(sourceValue, binding.transforms, registry);

    for (const name of missing) {
      issues.push({
        field: targetField,
        severity: 'error',
        message: `Unknown transform "${name}"`,
        path,
        transform: name,
      });
    }

    let finalValue: unknown = transformed;
    if (isEmptyValue(finalValue) && binding.fallback !== undefined) {
      finalValue = binding.fallback;
    }
    if (isEmptyValue(finalValue) && fieldMap.defaults?.[targetField] !== undefined) {
      finalValue = fieldMap.defaults[targetField];
    }

    const coerced = coerceForTarget(targetField, finalValue);
    (record as Record<FieldMapTargetField, unknown>)[targetField] = coerced;

    const isStillEmpty =
      (targetField === 'images' && Array.isArray(coerced) && coerced.length === 0) ||
      (targetField !== 'images' && (coerced === null || coerced === undefined));

    if (binding.required && isStillEmpty) {
      issues.push({
        field: targetField,
        severity: 'error',
        message: `Required field "${targetField}" resolved to empty`,
        path,
      });
    }
  }

  if (fieldMap.defaults) {
    for (const [targetField, value] of Object.entries(fieldMap.defaults) as Array<
      [FieldMapTargetField, unknown]
    >) {
      if (fieldMap.bindings[targetField]) continue;
      (record as Record<FieldMapTargetField, unknown>)[targetField] = coerceForTarget(
        targetField,
        value
      );
    }
  }

  return { record, issues };
};
