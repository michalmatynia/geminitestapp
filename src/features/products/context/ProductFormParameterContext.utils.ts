/**
 * Product Form Parameter Context Utilities
 * 
 * Utility functions for product parameter form management and processing.
 * Provides:
 * - Parameter value merging and normalization
 * - Title term type validation and linking
 * - Parameter storage ID decoding
 * - Language-specific parameter value resolution
 * - Structured product name processing
 * - Parameter value indexing and mapping
 */

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import {
  normalizeTitleTermName,
  splitStructuredProductName,
} from '@/shared/lib/products/title-terms';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';

/** Result type for merged parameter values with index mapping */
export type MergedParameterValuesResult = {
  /** Merged parameter values array */
  values: ProductParameterValue[];
  /** Index mapping from merged values back to base values */
  baseIndexByValueIndex: number[];
};

/**
 * Checks if a title term type is linked to parameters
 * @param value - Title term type to validate
 * @returns True if the type supports parameter linking
 */
export const isLinkedTitleTermType = (
  value: ProductParameter['linkedTitleTermType'] | undefined
): value is ProductTitleTermType =>
  value === 'size' || value === 'material' || value === 'theme';

export const resolvePrimaryParameterValue = (
  valuesByLanguage: Record<string, string>,
  fallbackValue: string = ''
): string => resolveStoredParameterValue(valuesByLanguage, fallbackValue);

const normalizeSourceParameterValue = (entry: ProductParameterValue): ProductParameterValue => {
  const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
  const directValue = typeof entry.value === 'string' ? entry.value : '';
  const fallbackValue = resolveStoredParameterValue(valuesByLanguage, directValue);

  return {
    parameterId: decodeSimpleParameterStorageId(entry.parameterId),
    value: fallbackValue,
    ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    ...(entry.skipParameterInference === true ? { skipParameterInference: true } : {}),
  };
};

export const normalizeSourceParameterValues = (
  sourceParams: ProductParameterValue[] | null | undefined
): ProductParameterValue[] => {
  if (!Array.isArray(sourceParams)) return [];
  return sourceParams.map(normalizeSourceParameterValue);
};

export const normalizeEditableParameterValuesByLanguage = (
  input: unknown
): Record<string, string> => {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>)
    .map(([languageCode, rawValue]): [string, string] | null => {
      const normalizedLanguageCode = languageCode.trim().toLowerCase();
      if (
        normalizedLanguageCode.length === 0 ||
        typeof rawValue !== 'string' ||
        rawValue.length === 0
      ) {
        return null;
      }
      return [normalizedLanguageCode, rawValue];
    })
    .filter((entry): entry is [string, string] => entry !== null);

  return Object.fromEntries(entries);
};

const resolveEditableParameterValue = (
  valuesByLanguage: Record<string, string>,
  directValue: string | null | undefined = ''
): string => {
  const normalizedDirectValue = typeof directValue === 'string' ? directValue : '';
  const defaultValue = valuesByLanguage['default'];
  if (typeof defaultValue === 'string' && defaultValue.length > 0) return defaultValue;

  const localizedValues = Object.values(valuesByLanguage);
  if (localizedValues.length === 0) return normalizedDirectValue;

  return normalizedDirectValue.length > 0 && localizedValues.includes(normalizedDirectValue)
    ? normalizedDirectValue
    : '';
};

const resolveNextEditableScalarCandidate = ({
  currentScalarValue,
  previousLocalizedValue,
  hadLocalizedValues,
  nextLocalizedValue,
}: {
  currentScalarValue: string;
  previousLocalizedValue: string;
  hadLocalizedValues: boolean;
  nextLocalizedValue: string;
}): string => {
  if (currentScalarValue.length === 0) return currentScalarValue;
  if (currentScalarValue === previousLocalizedValue) return nextLocalizedValue;
  if (!hadLocalizedValues) return nextLocalizedValue;
  return currentScalarValue;
};

const applyEditableLocalizedValue = (
  currentValues: Record<string, string>,
  languageCode: string,
  nextValue: string
): Record<string, string> => {
  if (nextValue.length > 0) return { ...currentValues, [languageCode]: nextValue };

  return Object.fromEntries(
    Object.entries(currentValues).filter(
      ([entryLanguageCode]): boolean => entryLanguageCode !== languageCode
    )
  );
};

export const resolveEditableLocalizedParameterEntry = ({
  current,
  languageCode,
  nextValue,
}: {
  current: ProductParameterValue;
  languageCode: string;
  nextValue: string;
}): ProductParameterValue | null => {
  const normalizedLang = languageCode.trim().toLowerCase();
  if (normalizedLang.length === 0) return null;

  const currentValues = normalizeEditableParameterValuesByLanguage(current.valuesByLanguage);
  const hadLocalizedValues = Object.keys(currentValues).length > 0;
  const previousLocalizedValue = currentValues[normalizedLang] ?? '';
  const nextValues = applyEditableLocalizedValue(currentValues, normalizedLang, nextValue);
  const currentScalarValue = typeof current.value === 'string' ? current.value : '';
  const nextScalarCandidate = resolveNextEditableScalarCandidate({
    currentScalarValue,
    previousLocalizedValue,
    hadLocalizedValues,
    nextLocalizedValue: nextValue,
  });
  const nextPrimaryValue = resolveEditableParameterValue(nextValues, nextScalarCandidate);
  const nextEntry: ProductParameterValue = { ...current, value: nextPrimaryValue };

  if (Object.keys(nextValues).length > 0) return { ...nextEntry, valuesByLanguage: nextValues };
  return {
    parameterId: nextEntry.parameterId,
    value: nextEntry.value,
    ...(nextEntry.skipParameterInference === true ? { skipParameterInference: true } : {}),
  };
};

export const serializeParameterValues = (value: ProductParameterValue[]): string =>
  JSON.stringify(value);

export const resolveStructuredLinkedTermValues = (
  value: string
): Record<ProductTitleTermType, string> => {
  const segments = splitStructuredProductName(value);
  return {
    size: segments[1] ?? '',
    material: segments[2] ?? '',
    theme: segments[4] ?? '',
  };
};

export const buildTitleTermLookup = (
  terms: ProductTitleTerm[] | undefined
): Map<string, ProductTitleTerm> => {
  const lookup = new Map<string, ProductTitleTerm>();
  (terms ?? []).forEach((term) => {
    const key = normalizeTitleTermName(term.name_en);
    if (key.length === 0 || lookup.has(key)) return;
    lookup.set(key, term);
  });
  return lookup;
};

export const resolveLinkedParameterValue = (
  parameterId: string,
  term: ProductTitleTerm
): ProductParameterValue => ({
  parameterId,
  value: term.name_en,
  valuesByLanguage: {
    en: term.name_en,
    pl: term.name_pl !== null && term.name_pl.length > 0 ? term.name_pl : term.name_en,
  },
});

export const resolveLinkedParameterValuesById = ({
  linkedParameters,
  structuredLinkedTermValues,
  titleTermLookups,
}: {
  linkedParameters: ProductParameter[];
  structuredLinkedTermValues: Record<ProductTitleTermType, string>;
  titleTermLookups: Record<ProductTitleTermType, Map<string, ProductTitleTerm>>;
}): Map<string, ProductParameterValue> => {
  const resolved = new Map<string, ProductParameterValue>();
  linkedParameters.forEach((parameter) => {
    const linkedType = parameter.linkedTitleTermType;
    if (!isLinkedTitleTermType(linkedType)) return;

    const rawValue = structuredLinkedTermValues[linkedType];
    const lookupKey = normalizeTitleTermName(rawValue);
    if (lookupKey.length === 0) return;

    const matchedTerm = titleTermLookups[linkedType].get(lookupKey);
    if (matchedTerm !== undefined) {
      resolved.set(parameter.id, resolveLinkedParameterValue(parameter.id, matchedTerm));
      return;
    }
    // No matching title term — use the raw name segment so the parameter is
    // always present when the product name encodes a value for this linked type.
    resolved.set(parameter.id, { parameterId: parameter.id, value: rawValue, valuesByLanguage: { en: rawValue } });
  });
  return resolved;
};

export const mergeLinkedParameterValues = ({
  baseValues,
  linkedParameterIds,
  linkedParameters,
  resolvedLinkedValuesById,
}: {
  baseValues: ProductParameterValue[];
  linkedParameterIds: Set<string>;
  linkedParameters: ProductParameter[];
  resolvedLinkedValuesById: Map<string, ProductParameterValue>;
}): MergedParameterValuesResult => {
  const nextValues: ProductParameterValue[] = [];
  const baseIndexByValueIndex: number[] = [];
  const usedLinkedParameterIds = new Set<string>();

  baseValues.forEach((entry, baseIndex) => {
    const normalizedParameterId = entry.parameterId.trim();
    if (normalizedParameterId.length === 0 || !linkedParameterIds.has(normalizedParameterId)) {
      nextValues.push(entry);
      baseIndexByValueIndex.push(baseIndex);
      return;
    }
    if (usedLinkedParameterIds.has(normalizedParameterId)) return;

    const linkedValue = resolvedLinkedValuesById.get(normalizedParameterId);
    // Fall back to the stored value when the term lookup has no match (e.g. terms
    // still loading). Dropping the entry here would cause a save to clear the
    // parameter value before the title-term queries have resolved.
    nextValues.push(linkedValue ?? entry);
    baseIndexByValueIndex.push(baseIndex);
    usedLinkedParameterIds.add(normalizedParameterId);
  });

  linkedParameters.forEach((parameter) => {
    const linkedValue = resolvedLinkedValuesById.get(parameter.id);
    if (linkedValue === undefined || usedLinkedParameterIds.has(parameter.id)) return;
    nextValues.push(linkedValue);
    baseIndexByValueIndex.push(-1);
    usedLinkedParameterIds.add(parameter.id);
  });

  return { values: nextValues, baseIndexByValueIndex };
};
