import {
  type ProductBatchEditField,
  type ProductBatchEditFieldDefinition,
  PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS,
  type ProductBatchEditMode,
  type ProductBatchEditOperation,
  type ProductBatchEditRequest,
  type ProductBatchEditResponse,
} from '@/shared/contracts/products/batch-edit';

export type ProductBatchEditDraftOperation = {
  id: string;
  field: ProductBatchEditField;
  language: 'en' | 'pl' | 'de' | 'all';
  mode: ProductBatchEditMode;
  value: string;
  find: string;
  replaceWith: string;
};

export type ProductBatchEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  isSubmitting: boolean;
  onSubmit: (request: ProductBatchEditRequest) => Promise<ProductBatchEditResponse>;
  onApplied: (response: ProductBatchEditResponse) => void;
};

export type ProductBatchEditModeOption = {
  value: ProductBatchEditMode;
  label: string;
};

const MODE_LABELS: Record<ProductBatchEditMode, string> = {
  set: 'Set',
  remove: 'Remove / clear',
  prepend: 'Append at beginning',
  append: 'Append at end',
  replace: 'Replace specific value',
};

export const FIELD_OPTIONS = PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS.map((definition) => ({
  value: definition.field,
  label: definition.label,
  group: definition.group,
  description: definition.description,
}));

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polish' },
  { value: 'de', label: 'German' },
  { value: 'all', label: 'All languages' },
];

export const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
];

const FIELD_DEFINITION_BY_FIELD = new Map<ProductBatchEditField, ProductBatchEditFieldDefinition>(
  PRODUCT_BATCH_EDIT_FIELD_DEFINITIONS.map((definition) => [definition.field, definition])
);

export const createDraftOperation = (): ProductBatchEditDraftOperation => ({
  id: crypto.randomUUID(),
  field: 'name',
  language: 'en',
  mode: 'set',
  value: '',
  find: '',
  replaceWith: '',
});

export const getDefinition = (
  field: ProductBatchEditField
): ProductBatchEditFieldDefinition => {
  const definition = FIELD_DEFINITION_BY_FIELD.get(field);
  if (definition === undefined) {
    throw new Error(`Unsupported product batch edit field: ${field}`);
  }
  return definition;
};

export const getAllowedModes = (
  definition: ProductBatchEditFieldDefinition
): ProductBatchEditMode[] => {
  if (['number', 'boolean', 'enum', 'json-object'].includes(definition.kind)) {
    return ['set', 'remove', 'replace'];
  }
  return ['set', 'remove', 'prepend', 'append', 'replace'];
};

export const buildModeOptions = (
  definition: ProductBatchEditFieldDefinition
): ProductBatchEditModeOption[] =>
  getAllowedModes(definition).map((mode) => ({
    value: mode,
    label: MODE_LABELS[mode],
  }));

export const isJsonField = (definition: ProductBatchEditFieldDefinition): boolean =>
  definition.kind === 'json-array' || definition.kind === 'json-object';

export const getValuePlaceholder = (
  definition: ProductBatchEditFieldDefinition,
  mode: ProductBatchEditMode
): string => {
  if (definition.kind === 'string-array') return 'One value per line, comma-separated, or JSON array';
  if (definition.kind === 'json-array') return '[{"fieldId":"...","textValue":"..."}]';
  if (definition.kind === 'json-object') return '{"text":"Note","color":"yellow"}';
  if (definition.kind === 'number') return '0';
  if (definition.kind === 'enum') return 'base';
  if (mode === 'remove') return 'Optional value to remove; leave empty to clear';
  return 'Value';
};

const trimOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
};

const requiresReplacementValue = (definition: ProductBatchEditFieldDefinition): boolean =>
  ['number', 'boolean', 'json-array'].includes(definition.kind);

export const buildOperation = (
  draft: ProductBatchEditDraftOperation
): ProductBatchEditOperation => {
  const definition = getDefinition(draft.field);
  const operation: ProductBatchEditOperation = {
    field: draft.field,
    mode: draft.mode,
  };

  if (definition.kind === 'localized-text') {
    operation.language = draft.language;
  }
  if (draft.mode === 'replace') {
    operation.find = draft.find;
    operation.replaceWith = draft.replaceWith;
    return operation;
  }
  if (draft.mode === 'remove') {
    const optionalValue = trimOptional(draft.value);
    if (optionalValue !== undefined) operation.value = optionalValue;
    return operation;
  }

  operation.value = draft.value;
  return operation;
};

const validateDraft = (draft: ProductBatchEditDraftOperation): string | null => {
  const definition = getDefinition(draft.field);
  const label = definition.label;
  if (draft.mode !== 'remove' && draft.mode !== 'replace' && draft.value.trim().length === 0) {
    return `${label}: value is required.`;
  }
  if (draft.mode !== 'replace') return null;
  if (draft.find.trim().length === 0) return `${label}: value to find is required.`;
  if (requiresReplacementValue(definition) && draft.replaceWith.trim().length === 0) {
    return `${label}: replacement value is required.`;
  }
  return null;
};

export const validateDrafts = (drafts: ProductBatchEditDraftOperation[]): string | null => {
  for (const draft of drafts) {
    const error = validateDraft(draft);
    if (error !== null) return error;
  }
  return null;
};

export const summarizePreview = (response: ProductBatchEditResponse | null): string | null => {
  if (response === null) return null;
  const label = response.dryRun ? 'Preview' : 'Applied';
  return `${label}: ${response.changed} changed, ${response.unchanged} unchanged, ${response.failed} failed.`;
};
