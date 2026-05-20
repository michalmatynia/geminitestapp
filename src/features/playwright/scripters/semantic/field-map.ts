import type { z } from 'zod';

import { evaluatePath, evaluatePaths } from '../path';
import { applyTransforms, BUILTIN_TRANSFORMS, type TransformRegistry } from '../transforms';
import type { FieldBinding } from '../types';
import type { semanticFieldMapSchema } from './schema';
import type {
  SemanticFieldMapIssue,
  SemanticMappedRecord,
  SemanticTargetField,
} from './types';

type SemanticFieldMap = z.infer<typeof semanticFieldMapSchema>;

// ── Array-typed fields ────────────────────────────────────────────────────────

const ARRAY_FIELDS = new Set<SemanticTargetField>(['images', 'tags']);
const isArrayField = (field: SemanticTargetField): boolean => ARRAY_FIELDS.has(field);

// ── Coercion helpers ──────────────────────────────────────────────────────────

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
  field: SemanticTargetField,
  value: unknown
): SemanticMappedRecord[SemanticTargetField] => {
  if (field === 'price') return toNumberOrNull(value);
  if (isArrayField(field)) return toStringArray(value);
  return toStringOrNull(value);
};

// ── Empty value check ─────────────────────────────────────────────────────────

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

// ── Source resolution ─────────────────────────────────────────────────────────

const resolveBindingSource = (
  binding: FieldBinding,
  raw: unknown
): { value: unknown; path: string | undefined } => {
  if (binding.constant !== undefined) return { value: binding.constant, path: undefined };
  if (binding.paths && binding.paths.length > 0) {
    return { value: evaluatePaths(raw, binding.paths), path: binding.paths.join('|') };
  }
  if (binding.path) return { value: evaluatePath(raw, binding.path), path: binding.path };
  return { value: undefined, path: undefined };
};

// ── Empty record constant ─────────────────────────────────────────────────────

export const SEMANTIC_EMPTY_RECORD: Readonly<Omit<SemanticMappedRecord, 'raw'>> = Object.freeze({
  title: null,
  description: null,
  sourceUrl: null,
  canonicalUrl: null,
  images: [],
  language: null,
  tags: [],
  externalId: null,
  price: null,
  currency: null,
  sku: null,
  ean: null,
  brand: null,
  category: null,
  author: null,
  publishedAt: null,
  bodyText: null,
  excerpt: null,
  company: null,
  location: null,
  salary: null,
  jobType: null,
  applyUrl: null,
  postedAt: null,
  requirements: null,
});

// ── Field map evaluation ──────────────────────────────────────────────────────

export type SemanticFieldMapEvaluation = {
  record: SemanticMappedRecord;
  issues: SemanticFieldMapIssue[];
};

export const evaluateSemanticFieldMap = (
  raw: Record<string, unknown>,
  fieldMap: SemanticFieldMap,
  registry: TransformRegistry = BUILTIN_TRANSFORMS
): SemanticFieldMapEvaluation => {
  const record: SemanticMappedRecord = { ...SEMANTIC_EMPTY_RECORD, images: [], tags: [], raw };
  const issues: SemanticFieldMapIssue[] = [];

  for (const [targetField, binding] of Object.entries(fieldMap.bindings) as Array<
    [SemanticTargetField, FieldBinding]
  >) {
    const { value: sourceValue, path } = resolveBindingSource(binding, raw);
    const { value: transformed, missing } = applyTransforms(sourceValue, binding.transforms, registry);

    for (const name of missing) {
      issues.push({ field: targetField, severity: 'error', message: `Unknown transform "${name}"`, path, transform: name });
    }

    let finalValue: unknown = transformed;
    if (isEmptyValue(finalValue) && binding.fallback !== undefined) finalValue = binding.fallback;
    if (isEmptyValue(finalValue) && fieldMap.defaults?.[targetField] !== undefined) {
      finalValue = fieldMap.defaults[targetField];
    }

    const coerced = coerceForTarget(targetField, finalValue);
    (record as Record<SemanticTargetField, unknown>)[targetField] = coerced;

    const isStillEmpty = isArrayField(targetField)
      ? Array.isArray(coerced) && coerced.length === 0
      : coerced === null || coerced === undefined;

    if (binding.required === true && isStillEmpty) {
      issues.push({ field: targetField, severity: 'error', message: `Required field "${targetField}" resolved to empty`, path });
    }
  }

  // Apply defaults for fields with no binding
  if (fieldMap.defaults) {
    for (const [targetField, value] of Object.entries(fieldMap.defaults) as Array<
      [SemanticTargetField, unknown]
    >) {
      if (fieldMap.bindings[targetField]) continue;
      (record as Record<SemanticTargetField, unknown>)[targetField] = coerceForTarget(targetField, value);
    }
  }

  return { record, issues };
};
