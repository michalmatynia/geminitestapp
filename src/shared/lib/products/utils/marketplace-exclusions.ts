import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import {
  getBaseMarketExclusionOptionDefinitions,
  MARKET_EXCLUSION_FIELD_NAME,
  normalizeBaseMarketplaceCheckboxKey,
} from '@/shared/lib/integrations/base-marketplace-checkboxes';

import {
  normalizeProductCustomFieldSelectedOptionIds,
  normalizeProductCustomFieldValues,
} from './custom-field-values';

const normalizeFieldName = (value: string): string =>
  normalizeBaseMarketplaceCheckboxKey(value);

const resolveMarketExclusionFieldDefinition = (
  customFieldDefinitions: ProductCustomFieldDefinition[] | undefined
): ProductCustomFieldDefinition | null =>
  customFieldDefinitions?.find(
    (definition) =>
      definition.type === 'checkbox_set' &&
      normalizeFieldName(definition.name) === normalizeFieldName(MARKET_EXCLUSION_FIELD_NAME)
  ) ?? null;

const resolveMarketExclusionOptionId = (
  customFieldDefinitions: ProductCustomFieldDefinition[] | undefined,
  marketplaceLabelOrAlias: string
): string | null => {
  const normalizedMarketplace = normalizeFieldName(marketplaceLabelOrAlias);
  if (normalizedMarketplace.length === 0) return null;

  const option =
    getBaseMarketExclusionOptionDefinitions(customFieldDefinitions).find((candidate) =>
      [candidate.label, ...candidate.aliases].some(
        (alias) => normalizeFieldName(alias) === normalizedMarketplace
      )
    ) ?? null;

  return option?.id ?? null;
};

export const hasProductMarketplaceExclusionSelection = ({
  customFieldDefinitions,
  customFieldValues,
  marketplaceLabelOrAlias,
}: {
  customFieldDefinitions?: ProductCustomFieldDefinition[];
  customFieldValues?: unknown;
  marketplaceLabelOrAlias: string;
}): boolean => {
  const fieldDefinition = resolveMarketExclusionFieldDefinition(customFieldDefinitions);
  const optionId = resolveMarketExclusionOptionId(customFieldDefinitions, marketplaceLabelOrAlias);
  if (!fieldDefinition || optionId === null) return false;

  const fieldValue = normalizeProductCustomFieldValues(customFieldValues).find(
    (entry) => entry.fieldId === fieldDefinition.id
  );

  return normalizeProductCustomFieldSelectedOptionIds(fieldValue?.selectedOptionIds).includes(
    optionId
  );
};

export const ensureProductMarketplaceExclusionSelection = ({
  customFieldDefinitions,
  customFieldValues,
  marketplaceLabelOrAlias,
}: {
  customFieldDefinitions?: ProductCustomFieldDefinition[];
  customFieldValues?: unknown;
  marketplaceLabelOrAlias: string;
}):
  | {
      changed: boolean;
      customFields: ProductCustomFieldValue[];
    }
  | null => {
  const fieldDefinition = resolveMarketExclusionFieldDefinition(customFieldDefinitions);
  const optionId = resolveMarketExclusionOptionId(customFieldDefinitions, marketplaceLabelOrAlias);
  if (!fieldDefinition || optionId === null) return null;

  const normalizedValues = normalizeProductCustomFieldValues(customFieldValues);
  const existingFieldValue = normalizedValues.find((entry) => entry.fieldId === fieldDefinition.id);
  const selectedOptionIds = normalizeProductCustomFieldSelectedOptionIds(
    existingFieldValue?.selectedOptionIds
  );

  if (selectedOptionIds.includes(optionId)) {
    return {
      changed: false,
      customFields: normalizedValues,
    };
  }

  const nextFieldValue: ProductCustomFieldValue = {
    fieldId: fieldDefinition.id,
    selectedOptionIds: [...selectedOptionIds, optionId],
  };

  return {
    changed: true,
    customFields: normalizedValues.some((entry) => entry.fieldId === fieldDefinition.id)
      ? normalizedValues.map((entry) =>
          entry.fieldId === fieldDefinition.id ? nextFieldValue : entry
        )
      : [...normalizedValues, nextFieldValue],
  };
};
