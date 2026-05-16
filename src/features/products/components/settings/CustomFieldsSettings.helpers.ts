import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldOption,
  ProductCustomFieldType,
} from '@/shared/contracts/products/custom-fields';

export type CustomFieldFormData = {
  name: string;
  type: ProductCustomFieldType;
  optionsInput: string;
};

export type CustomFieldSavePayload = {
  data: {
    name: string;
    options: ProductCustomFieldOption[];
    type: ProductCustomFieldType;
  };
  id: string | undefined;
};

export const EMPTY_CUSTOM_FIELD_FORM: CustomFieldFormData = {
  name: '',
  type: 'text',
  optionsInput: '',
};

export const CUSTOM_FIELD_TYPE_OPTIONS: Array<LabeledOptionDto<ProductCustomFieldType>> = [
  { value: 'text', label: 'Text Field' },
  { value: 'checkbox_set', label: 'Checkbox Set' },
];

export const CUSTOM_FIELD_TYPE_SELECT_OPTIONS: Array<LabeledOptionDto<string>> =
  CUSTOM_FIELD_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

export const normalizeOptionLabels = (input: string): string[] => {
  const seen = new Set<string>();
  return input
    .split('\n')
    .flatMap((line: string) => line.split(','))
    .map((value: string) => value.trim())
    .filter((value: string): boolean => {
      if (value === '') return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const optionsToMultiline = (
  options: ProductCustomFieldOption[] | null | undefined
): string => (options ?? []).map((option) => option.label).join('\n');

const buildOptionId = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `custom-field-option-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const buildNextOptions = (
  input: string,
  existingOptions: ProductCustomFieldOption[]
): ProductCustomFieldOption[] => {
  const labels = normalizeOptionLabels(input);
  const existingByLabel = new Map(
    existingOptions.map((option) => [option.label.trim().toLowerCase(), option] as const)
  );
  const usedIds = new Set<string>();

  return labels.map((label, index) => {
    const labelKey = label.toLowerCase();
    const exactMatch = existingByLabel.get(labelKey);
    if (exactMatch !== undefined && !usedIds.has(exactMatch.id)) {
      usedIds.add(exactMatch.id);
      return { id: exactMatch.id, label };
    }

    const positionalMatch = existingOptions[index];
    if (positionalMatch !== undefined && !usedIds.has(positionalMatch.id)) {
      usedIds.add(positionalMatch.id);
      return { id: positionalMatch.id, label };
    }

    const id = buildOptionId();
    usedIds.add(id);
    return { id, label };
  });
};

export const getCustomFieldTypeLabel = (type: ProductCustomFieldType): string =>
  CUSTOM_FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;

export const buildCustomFieldFormData = (
  customField: ProductCustomFieldDefinition
): CustomFieldFormData => ({
  name: customField.name,
  type: customField.type,
  optionsInput: optionsToMultiline(customField.options),
});

export const buildCustomFieldSavePayload = (
  formData: CustomFieldFormData,
  editingCustomField: ProductCustomFieldDefinition | null
): { error: string | null; payload: CustomFieldSavePayload | null } => {
  const name = formData.name.trim();
  if (name === '') return { error: 'Field title is required.', payload: null };

  const options =
    formData.type === 'checkbox_set'
      ? buildNextOptions(formData.optionsInput, editingCustomField?.options ?? [])
      : [];
  if (formData.type === 'checkbox_set' && options.length === 0) {
    return { error: 'Checkbox sets require at least one checkbox name.', payload: null };
  }

  return {
    error: null,
    payload: {
      id: editingCustomField?.id,
      data: { name, type: formData.type, options },
    },
  };
};
