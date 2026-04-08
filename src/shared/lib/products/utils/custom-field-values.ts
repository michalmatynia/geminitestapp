import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalizeProductCustomFieldSelectedOptionIds = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const optionIds: string[] = [];

  input.forEach((entry: unknown) => {
    const optionId = toTrimmedString(entry);
    if (!optionId || seen.has(optionId)) return;
    seen.add(optionId);
    optionIds.push(optionId);
  });

  return optionIds;
};

export const normalizeProductCustomFieldValues = (input: unknown): ProductCustomFieldValue[] => {
  if (!Array.isArray(input)) return [];

  const byFieldId = new Map<string, ProductCustomFieldValue>();

  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;

    const record = entry as Record<string, unknown>;
    const fieldId = toTrimmedString(record['fieldId']);
    if (!fieldId) return;

    if (hasOwn(record, 'selectedOptionIds')) {
      byFieldId.set(fieldId, {
        fieldId,
        selectedOptionIds: normalizeProductCustomFieldSelectedOptionIds(record['selectedOptionIds']),
      });
      return;
    }

    if (hasOwn(record, 'textValue')) {
      byFieldId.set(fieldId, {
        fieldId,
        textValue: toTrimmedString(record['textValue']),
      });
    }
  });

  return Array.from(byFieldId.values());
};

export const filterProductCustomFieldValuesByDefinitions = (
  input: unknown,
  definitions: ProductCustomFieldDefinition[]
): ProductCustomFieldValue[] => {
  const normalizedValues = normalizeProductCustomFieldValues(input);
  if (!Array.isArray(definitions) || definitions.length === 0) return [];

  const definitionsById = new Map<string, ProductCustomFieldDefinition>();
  definitions.forEach((definition: ProductCustomFieldDefinition) => {
    definitionsById.set(definition.id, definition);
  });

  return normalizedValues.flatMap((entry: ProductCustomFieldValue): ProductCustomFieldValue[] => {
    const definition = definitionsById.get(entry.fieldId);
    if (!definition) return [];

    if (definition.type === 'checkbox_set') {
      const optionIds = new Set<string>(definition.options.map((option) => option.id));
      return [
        {
          fieldId: entry.fieldId,
          selectedOptionIds: normalizeProductCustomFieldSelectedOptionIds(
            entry.selectedOptionIds
          ).filter((optionId: string): boolean => optionIds.has(optionId)),
        },
      ];
    }

    return [
      {
        fieldId: entry.fieldId,
        textValue: typeof entry.textValue === 'string' ? entry.textValue.trim() : '',
      },
    ];
  });
};
