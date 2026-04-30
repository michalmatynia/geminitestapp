import type {
  ProductCustomFieldDefinition,
} from '@/shared/contracts/products/custom-fields';
import {
  normalizeComparableText,
} from './ProductScanAmazonExtractedFieldsPanel.parse';
import type {
  ProductScanAmazonAttributeMappingRow,
  ProductScanAmazonFormBindings,
  ScanAttributeMapping,
} from './ProductScanAmazonExtractedFieldsPanel.types';

const haveSameSelectedOptions = (
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined
): boolean => {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((value) => rightSet.has(value));
};

const formatCustomFieldSelectedOptionLabels = (
  field: ProductCustomFieldDefinition,
  optionIds: readonly string[] | null | undefined
): string | null => {
  if (field.type !== 'checkbox_set') return null;
  if (Array.isArray(optionIds) === false || optionIds.length === 0) return null;

  const labelByOptionId = new Map<string, string>(
    field.options.map((option) => [option.id, option.label])
  );
  const labels = optionIds
    .filter((optionId): optionId is string => typeof optionId === 'string')
    .map((optionId) => labelByOptionId.get(optionId))
    .filter((label): label is string => normalizeComparableText(label) !== null);

  return labels.length > 0 ? labels.join(', ') : null;
};

const isAttributeMappingPending = (
  mapping: ScanAttributeMapping,
  formBindings: ProductScanAmazonFormBindings
): boolean => {
  if (mapping.targetType === 'parameter') {
    return isParameterMappingPending(mapping, formBindings);
  }

  const existingValue = formBindings.customFieldValues.find(
    (entry) => entry.fieldId === mapping.targetId
  );
  if (mapping.targetType === 'custom_field_text') {
    return normalizeComparableText(existingValue?.textValue) !== normalizeComparableText(mapping.value);
  }

  return haveSameSelectedOptions(existingValue?.selectedOptionIds, mapping.targetOptionIds) === false;
};

const isParameterMappingPending = (
  mapping: Extract<ScanAttributeMapping, { targetType: 'parameter' }>,
  formBindings: ProductScanAmazonFormBindings
): boolean => {
  const existingValue = formBindings.parameterValues.find(
    (entry) => entry.parameterId === mapping.targetId
  )?.value;
  return normalizeComparableText(existingValue) !== normalizeComparableText(mapping.value);
};

const getAttributeMappingCurrentValue = (
  mapping: ScanAttributeMapping,
  formBindings: ProductScanAmazonFormBindings
): string | null => {
  if (mapping.targetType === 'parameter') {
    return getParameterMappingCurrentValue(mapping, formBindings);
  }

  const existingValue = formBindings.customFieldValues.find((entry) => entry.fieldId === mapping.targetId);
  if (mapping.targetType === 'custom_field_text') {
    return normalizeComparableText(existingValue?.textValue);
  }

  const targetField = formBindings.customFields.find((field) => field.id === mapping.targetId);
  return targetField === undefined
    ? null
    : formatCustomFieldSelectedOptionLabels(targetField, existingValue?.selectedOptionIds);
};

const getParameterMappingCurrentValue = (
  mapping: Extract<ScanAttributeMapping, { targetType: 'parameter' }>,
  formBindings: ProductScanAmazonFormBindings
): string | null =>
  normalizeComparableText(
    formBindings.parameterValues.find((entry) => entry.parameterId === mapping.targetId)?.value
  );

const formatAttributeMappingLabel = (mapping: ScanAttributeMapping): string => {
  const targetTypeLabel = mapping.targetType === 'parameter' ? 'Parameter' : 'Custom field';
  const optionLabel = formatAttributeMappingOptionLabel(mapping);
  return `${mapping.sourceLabel} -> ${targetTypeLabel}: ${mapping.targetLabel}${optionLabel}`;
};

const formatAttributeMappingOptionLabel = (mapping: ScanAttributeMapping): string => {
  if (mapping.targetType !== 'custom_field_checkbox_set') return '';
  if (mapping.targetOptionLabels.length === 0) return '';
  return ` [${mapping.targetOptionLabels.join(', ')}]`;
};

export const buildAttributeMappingRows = (
  mappings: ScanAttributeMapping[],
  formBindings: ProductScanAmazonFormBindings
): ProductScanAmazonAttributeMappingRow[] =>
  mappings.map((mapping) => ({
    currentValue: getAttributeMappingCurrentValue(mapping, formBindings),
    isPending: isAttributeMappingPending(mapping, formBindings),
    label: formatAttributeMappingLabel(mapping),
    mapping,
  }));
