import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';

type ComparableParameterValue = {
  parameterId: string;
  value: string;
  valuesByLanguage?: Record<string, string>;
};

type ComparableCustomFieldValue = {
  fieldId: string;
  textValue?: string | null;
  selectedOptionIds?: string[];
};

type NonFormComparableState = {
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  customFieldValues: ComparableCustomFieldValue[];
  parameterValues: ComparableParameterValue[];
  imageSlots: string[];
  imageLinks: string[];
  imageBase64s: string[];
};

export const normalizeComparableString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const normalizeComparableStringList = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  values.forEach((value: unknown) => {
    const normalized = normalizeComparableString(value);
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

export const normalizeComparableNullableString = (value: unknown): string | null => {
  const normalized = normalizeComparableString(value);
  return normalized || null;
};

export const normalizeComparableParameterValues = (
  input: ProductParameterValue[]
): ComparableParameterValue[] => {
  return input
    .map((entry: ProductParameterValue): ComparableParameterValue => {
      const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
      const directValue = normalizeComparableString(entry.value);
      const normalizedParameterId = decodeSimpleParameterStorageId(
        normalizeComparableString(entry.parameterId)
      );
      return {
        parameterId: normalizedParameterId || '',
        value: resolveStoredParameterValue(valuesByLanguage, directValue),
        ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
      };
    })
    .filter((entry: ComparableParameterValue): boolean => entry.parameterId.length > 0);
};

export const normalizeComparableCustomFieldValues = (
  input: ComparableCustomFieldValue[]
): ComparableCustomFieldValue[] =>
  normalizeProductCustomFieldValues(input).map(
    (entry: ComparableCustomFieldValue): ComparableCustomFieldValue => ({
      fieldId: entry.fieldId,
      ...(typeof entry.textValue === 'string' ? { textValue: entry.textValue } : {}),
      ...(Array.isArray(entry.selectedOptionIds)
        ? { selectedOptionIds: entry.selectedOptionIds }
        : {}),
    })
  );

export const toComparableImageSlot = (slot: unknown): string => {
  if (!slot || typeof slot !== 'object') return '';
  const slotRecord = slot as { type?: unknown; data?: unknown };
  if (slotRecord.type === 'existing') {
    const existingRecord =
      slotRecord.data && typeof slotRecord.data === 'object'
        ? (slotRecord.data as Record<string, unknown>)
        : {};
    return `existing:${normalizeComparableString(existingRecord['id'])}`;
  }
  const fileRecord =
    slotRecord.data && typeof slotRecord.data === 'object'
      ? (slotRecord.data as Record<string, unknown>)
      : {};
  const sizeValue = fileRecord['size'];
  const lastModifiedValue = fileRecord['lastModified'];
  return [
    'file',
    normalizeComparableString(fileRecord['name']),
    typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? String(sizeValue) : '0',
    normalizeComparableString(fileRecord['type']),
    typeof lastModifiedValue === 'number' && Number.isFinite(lastModifiedValue)
      ? String(lastModifiedValue)
      : '0',
  ].join(':');
};

export const serializeNonFormComparableState = (value: {
  selectedCatalogIds: ReadonlyArray<unknown>;
  selectedCategoryId: unknown;
  selectedTagIds: ReadonlyArray<unknown>;
  selectedProducerIds: ReadonlyArray<unknown>;
  selectedNoteIds: ReadonlyArray<unknown>;
  customFieldValues: ComparableCustomFieldValue[];
  parameterValues: ProductParameterValue[];
  imageSlots: ReadonlyArray<unknown>;
  imageLinks: string[];
  imageBase64s: string[];
}): string => {
  const comparableState: NonFormComparableState = {
    selectedCatalogIds: normalizeComparableStringList(value.selectedCatalogIds),
    selectedCategoryId: normalizeComparableNullableString(value.selectedCategoryId),
    selectedTagIds: normalizeComparableStringList(value.selectedTagIds),
    selectedProducerIds: normalizeComparableStringList(value.selectedProducerIds),
    selectedNoteIds: normalizeComparableStringList(value.selectedNoteIds),
    customFieldValues: normalizeComparableCustomFieldValues(value.customFieldValues),
    parameterValues: normalizeComparableParameterValues(value.parameterValues),
    imageSlots: value.imageSlots.map(toComparableImageSlot),
    imageLinks: value.imageLinks.map((entry: string) => normalizeComparableString(entry)),
    imageBase64s: value.imageBase64s.map((entry: string) => normalizeComparableString(entry)),
  };

  return JSON.stringify(comparableState);
};
