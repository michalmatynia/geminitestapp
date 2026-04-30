import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS,
  PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS,
} from '@/features/products/lib/validatorSourceFields';
import { getReplacementFieldsForProductValidationTarget } from '@/features/products/lib/validatorTargetAdapters';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';

export const REPLACEMENT_FIELD_LABELS = PRODUCT_VALIDATION_REPLACEMENT_FIELD_LABELS;

export const REPLACEMENT_FIELD_OPTIONS = PRODUCT_VALIDATION_REPLACEMENT_FIELD_OPTIONS;

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.normalizereplacementfields
 */
export const normalizeReplacementFields = (fields: unknown, _target?: string): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (typeof field !== 'string' || field.length === 0) continue;
    if (!ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.formatreplacementfields
 */
export const formatReplacementFields = (fields: unknown): string => {
  const normalized = normalizeReplacementFields(fields);
  if (normalized.length === 0) return 'No fields selected';
  return normalized.map((field) => REPLACEMENT_FIELD_LABELS[field] ?? field).join(', ');
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getreplacementfieldsfortarget
 */
export const getReplacementFieldsForTarget = (
  target: string
): Array<LabeledOptionDto<string>> =>
  [...getReplacementFieldsForProductValidationTarget(target)].map((field) => ({
    value: field,
    label: REPLACEMENT_FIELD_LABELS[field] ?? field,
  }));
