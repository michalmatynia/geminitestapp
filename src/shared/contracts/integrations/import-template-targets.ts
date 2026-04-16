export const PRODUCT_CUSTOM_FIELD_TARGET_PREFIX = 'custom_field:' as const;
export const PRODUCT_CUSTOM_FIELD_OPTION_TARGET_PREFIX = 'custom_field_option:' as const;

export type ParsedProductCustomFieldTarget = {
  fieldId: string;
  optionId: string | null;
};

const splitTargetPayload = (payload: string): ParsedProductCustomFieldTarget | null => {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  const [fieldIdRaw, ...optionIdParts] = trimmed.split(':');
  const fieldId = fieldIdRaw?.trim() ?? '';
  const optionId = optionIdParts.join(':').trim();

  if (!fieldId) return null;

  return {
    fieldId,
    optionId: optionId.length > 0 ? optionId : null,
  };
};

export const buildProductCustomFieldTargetValue = (fieldId: string): string =>
  `${PRODUCT_CUSTOM_FIELD_TARGET_PREFIX}${fieldId.trim()}`;

export const buildProductCustomFieldOptionTargetValue = (
  fieldId: string,
  optionId: string
): string =>
  `${PRODUCT_CUSTOM_FIELD_OPTION_TARGET_PREFIX}${fieldId.trim()}:${optionId.trim()}`;

export const parseProductCustomFieldTarget = (
  targetField: string
): ParsedProductCustomFieldTarget | null => {
  const trimmed = targetField.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith(PRODUCT_CUSTOM_FIELD_OPTION_TARGET_PREFIX)) {
    return splitTargetPayload(trimmed.slice(PRODUCT_CUSTOM_FIELD_OPTION_TARGET_PREFIX.length));
  }

  if (!normalized.startsWith(PRODUCT_CUSTOM_FIELD_TARGET_PREFIX)) {
    return null;
  }

  return splitTargetPayload(trimmed.slice(PRODUCT_CUSTOM_FIELD_TARGET_PREFIX.length));
};
