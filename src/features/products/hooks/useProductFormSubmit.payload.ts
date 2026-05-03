import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData, ProductImageSlot } from '@/shared/contracts/products/drafts';
import type {
  ProductParameterValue,
  ResolvedProductParameterValue,
} from '@/shared/contracts/products/product';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  mergeProductParameterValue,
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';

export type BuildProductFormDataInput = {
  data: ProductFormData;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  customFieldValues: ProductCustomFieldValue[];
  parameterValues: ProductParameterValue[];
  studioProjectId: string | null;
};

const MANAGED_FORM_DATA_FIELDS = new Set<string>([
  'catalogIds',
  'categoryId',
  'customFields',
  'imageBase64s',
  'imageLinks',
  'noteIds',
  'parameters',
  'producerIds',
  'studioProjectId',
  'tagIds',
]);

const resolveNormalizedParameterId = (parameterId: unknown): string =>
  decodeSimpleParameterStorageId(typeof parameterId === 'string' ? parameterId.trim() : '');

const resolveDirectParameterValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalizeProductParametersForSubmission = (
  parameterValues: ProductParameterValue[]
): ResolvedProductParameterValue[] =>
  Array.from(
    parameterValues.reduce(
      (
        byParameterId: Map<string, ResolvedProductParameterValue>,
        entry: ProductParameterValue
      ): Map<string, ResolvedProductParameterValue> => {
        const normalizedParameterId = resolveNormalizedParameterId(entry.parameterId);
        if (normalizedParameterId === '') return byParameterId;

        const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
        const directValue = resolveDirectParameterValue(entry.value);
        const existingEntry = byParameterId.get(normalizedParameterId);
        const skipParameterInference = entry.skipParameterInference === true;
        byParameterId.set(
          normalizedParameterId,
          Object.keys(valuesByLanguage).length > 0
            ? mergeProductParameterValue(existingEntry, {
                parameterId: normalizedParameterId,
                value: directValue,
                valuesByLanguage,
                skipParameterInference,
              })
            : {
                parameterId: normalizedParameterId,
                value: resolveStoredParameterValue({}, directValue),
                ...(skipParameterInference ? { skipParameterInference: true } : {}),
              }
        );
        return byParameterId;
      },
      new Map<string, ResolvedProductParameterValue>()
    ).values()
  );

export const normalizeProductCustomFieldsForSubmission = (
  customFieldValues: ProductCustomFieldValue[]
): ProductCustomFieldValue[] => normalizeProductCustomFieldValues(customFieldValues);

const appendValueToFormData = (formData: FormData, key: string, value: unknown): void => {
  if (value === null || value === undefined) return;
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }
  if (typeof value === 'string') {
    formData.append(key, value);
    return;
  }
  formData.append(key, String(value as number | boolean));
};

const appendBaseFormDataEntries = (formData: FormData, data: ProductFormData): void => {
  Object.entries(data).forEach(([key, value]: [string, unknown]): void => {
    if (MANAGED_FORM_DATA_FIELDS.has(key)) return;
    // notes=undefined means the user cleared all note content. Send 'null' so the server
    // interprets it as an explicit clear rather than "field not provided, leave unchanged".
    if (key === 'notes' && value === undefined) {
      formData.append(key, 'null');
      return;
    }
    appendValueToFormData(formData, key, value);
  });
};

const appendImageFormDataEntries = (
  formData: FormData,
  imageSlots: (ProductImageSlot | null)[],
  imageLinks: string[],
  imageBase64s: string[]
): void => {
  formData.append('imageLinks', JSON.stringify(imageLinks.map((link: string): string => link.trim())));
  formData.append(
    'imageBase64s',
    JSON.stringify(imageBase64s.map((link: string): string => link.trim()))
  );

  imageSlots.forEach((slot: ProductImageSlot | null): void => {
    if (slot?.type === 'file') {
      formData.append('images', slot.data as Blob);
    } else if (slot?.type === 'existing') {
      formData.append('imageFileIds', slot.data.id);
    }
  });
};

const appendRepeatedValues = (
  formData: FormData,
  key: string,
  values: string[],
  appendEmptyWhenMissing: boolean
): void => {
  values.forEach((value: string): void => {
    formData.append(key, value);
  });
  if (appendEmptyWhenMissing && values.length === 0) {
    formData.append(key, '');
  }
};

const appendSelectionFormDataEntries = (
  formData: FormData,
  input: BuildProductFormDataInput
): void => {
  appendRepeatedValues(formData, 'catalogIds', input.selectedCatalogIds, false);
  formData.append('categoryId', input.selectedCategoryId ?? '');
  appendRepeatedValues(formData, 'tagIds', input.selectedTagIds, false);
  appendRepeatedValues(formData, 'producerIds', input.selectedProducerIds, true);
  appendRepeatedValues(formData, 'noteIds', input.selectedNoteIds, true);
};

const appendStructuredFormDataEntries = (
  formData: FormData,
  input: BuildProductFormDataInput
): void => {
  formData.append(
    'customFields',
    JSON.stringify(normalizeProductCustomFieldsForSubmission(input.customFieldValues))
  );
  formData.append(
    'parameters',
    JSON.stringify(normalizeProductParametersForSubmission(input.parameterValues))
  );
  formData.append('studioProjectId', input.studioProjectId ?? '');
};

export const buildProductFormData = (input: BuildProductFormDataInput): FormData => {
  const formData = new FormData();
  appendBaseFormDataEntries(formData, input.data);
  appendImageFormDataEntries(formData, input.imageSlots, input.imageLinks, input.imageBase64s);
  appendSelectionFormDataEntries(formData, input);
  appendStructuredFormDataEntries(formData, input);
  return formData;
};
