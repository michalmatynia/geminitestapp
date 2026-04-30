import type {
  ProductCustomFieldDefinition,
} from '@/shared/contracts/products/custom-fields';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  normalizeComparableText,
  normalizeMetadataLabel,
} from './ProductScanAmazonExtractedFieldsPanel.parse';
import type {
  AmazonScanMappedField,
  ProductScanAmazonFormBindings,
  ScanAttributeMapping,
} from './ProductScanAmazonExtractedFieldsPanel.types';

type AttributeMappingContext = {
  customFieldByLabel: Map<string, ProductCustomFieldDefinition>;
  parameterByLabel: Map<string, { id: string; label: string }>;
  usedTargets: Set<string>;
};

type CheckboxOptionMatch = {
  optionIds: string[];
  optionLabels: string[];
};

const KNOWN_AMAZON_DETAIL_FIELDS: Array<{
  key: keyof NonNullable<ProductScanRecord['amazonDetails']>;
  sourceLabel: string;
}> = [
  { sourceLabel: 'Brand', key: 'brand' },
  { sourceLabel: 'Manufacturer', key: 'manufacturer' },
  { sourceLabel: 'Model number', key: 'modelNumber' },
  { sourceLabel: 'Part number', key: 'partNumber' },
  { sourceLabel: 'Color', key: 'color' },
  { sourceLabel: 'Style', key: 'style' },
  { sourceLabel: 'Material', key: 'material' },
  { sourceLabel: 'Size', key: 'size' },
  { sourceLabel: 'Pattern', key: 'pattern' },
  { sourceLabel: 'Finish', key: 'finish' },
  { sourceLabel: 'Item dimensions', key: 'itemDimensions' },
  { sourceLabel: 'Package dimensions', key: 'packageDimensions' },
  { sourceLabel: 'Item weight', key: 'itemWeight' },
  { sourceLabel: 'Package weight', key: 'packageWeight' },
  { sourceLabel: 'Best Sellers Rank', key: 'bestSellersRank' },
];

export const buildAmazonMappedFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>
): AmazonScanMappedField[] => {
  const details = scan.amazonDetails;
  if (details === null) return [];

  const normalizedEntries = buildKnownAmazonMappedFields(details);
  const seenLabels = new Set(
    normalizedEntries
      .map((entry) => normalizeMetadataLabel(entry.sourceLabel))
      .filter((entry): entry is string => entry !== null)
  );
  const rawEntries = buildRawAmazonMappedFields(details, seenLabels);
  return [...normalizedEntries, ...rawEntries];
};

const buildKnownAmazonMappedFields = (
  details: NonNullable<ProductScanRecord['amazonDetails']>
): AmazonScanMappedField[] =>
  KNOWN_AMAZON_DETAIL_FIELDS
    .map((field) => ({
      sourceLabel: field.sourceLabel,
      value: readAmazonDetailField(details, field.key),
    }))
    .filter((entry): entry is AmazonScanMappedField => entry.value !== null);

const readAmazonDetailField = (
  details: NonNullable<ProductScanRecord['amazonDetails']>,
  key: keyof NonNullable<ProductScanRecord['amazonDetails']>
): string | null => {
  const value = details[key];
  return typeof value === 'string' ? normalizeComparableText(value) : null;
};

const buildRawAmazonMappedFields = (
  details: NonNullable<ProductScanRecord['amazonDetails']>,
  seenLabels: Set<string>
): AmazonScanMappedField[] =>
  details.attributes
    .map((entry) => ({
      sourceLabel: entry.label,
      value: entry.value,
    }))
    .filter((entry): entry is AmazonScanMappedField => isNewMappedField(entry, seenLabels));

const isNewMappedField = (
  entry: AmazonScanMappedField,
  seenLabels: Set<string>
): boolean => {
  const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
  return (
    normalizeComparableText(entry.value) !== null &&
    normalizedSourceLabel !== null &&
    seenLabels.has(normalizedSourceLabel) === false
  );
};

export const resolveAmazonMappedFieldKey = (field: AmazonScanMappedField): string =>
  [
    normalizeMetadataLabel(field.sourceLabel) ?? field.sourceLabel.trim().toLowerCase(),
    normalizeComparableText(field.value) ?? '',
  ].join('::');

const splitMultiValueTokens = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/\s*(?:,|;|\||\/|\band\b)\s*/i)
        .map((entry) => normalizeMetadataLabel(entry))
        .filter((entry): entry is string => entry !== null)
    )
  );

const resolveCheckboxSetOptionMatch = (
  field: ProductCustomFieldDefinition,
  sourceValue: string
): CheckboxOptionMatch | null => {
  if (field.type !== 'checkbox_set') return null;

  const optionsByLabel = buildOptionsByLabel(field);
  return (
    resolveExactCheckboxOptionMatch(sourceValue, optionsByLabel) ??
    resolveTokenCheckboxOptionMatch(sourceValue, optionsByLabel)
  );
};

const buildOptionsByLabel = (
  field: ProductCustomFieldDefinition
): Map<string, { id: string; label: string }> =>
  new Map(
    field.options
      .map((option) => {
        const normalizedLabel = normalizeMetadataLabel(option.label);
        return normalizedLabel === null
          ? null
          : [normalizedLabel, { id: option.id, label: option.label }];
      })
      .filter((entry): entry is [string, { id: string; label: string }] => entry !== null)
  );

const resolveExactCheckboxOptionMatch = (
  sourceValue: string,
  optionsByLabel: Map<string, { id: string; label: string }>
): CheckboxOptionMatch | null => {
  const exactMatch = normalizeMetadataLabel(sourceValue);
  const option = exactMatch === null ? undefined : optionsByLabel.get(exactMatch);
  return option === undefined
    ? null
    : { optionIds: [option.id], optionLabels: [option.label] };
};

const resolveTokenCheckboxOptionMatch = (
  sourceValue: string,
  optionsByLabel: Map<string, { id: string; label: string }>
): CheckboxOptionMatch | null => {
  const tokens = splitMultiValueTokens(sourceValue);
  if (tokens.length < 2) return null;

  const matchedOptions = tokens
    .map((token) => optionsByLabel.get(token))
    .filter((option): option is { id: string; label: string } => option !== undefined);
  if (matchedOptions.length !== tokens.length) return null;

  return {
    optionIds: matchedOptions.map((option) => option.id),
    optionLabels: matchedOptions.map((option) => option.label),
  };
};

export const buildAttributeMappings = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  formBindings: ProductScanAmazonFormBindings
): ScanAttributeMapping[] => {
  const sourceEntries = buildAmazonMappedFields(scan);
  if (sourceEntries.length === 0) return [];

  const context = buildAttributeMappingContext(formBindings);
  return sourceEntries
    .map((entry) => resolveAttributeMapping(entry, context))
    .filter((mapping): mapping is ScanAttributeMapping => mapping !== null);
};

const buildAttributeMappingContext = (
  formBindings: ProductScanAmazonFormBindings
): AttributeMappingContext => ({
  customFieldByLabel: buildCustomFieldMatches(formBindings),
  parameterByLabel: buildParameterMatches(formBindings),
  usedTargets: new Set<string>(),
});

const buildParameterMatches = (
  formBindings: ProductScanAmazonFormBindings
): Map<string, { id: string; label: string }> =>
  new Map(
    formBindings.parameters
      .map((parameter) => {
        const normalizedLabel =
          normalizeMetadataLabel(parameter.name_en) ??
          normalizeMetadataLabel(parameter.name_pl) ??
          normalizeMetadataLabel(parameter.name_de);
        if (normalizedLabel === null) return null;
        return [
          normalizedLabel,
          {
            id: parameter.id,
            label: resolveParameterLabel(parameter),
          },
        ];
      })
      .filter((entry): entry is [string, { id: string; label: string }] => entry !== null)
  );

const resolveParameterLabel = (
  parameter: ProductScanAmazonFormBindings['parameters'][number]
): string =>
  normalizeComparableText(parameter.name_en) ??
  normalizeComparableText(parameter.name_pl) ??
  normalizeComparableText(parameter.name_de) ??
  'Parameter';

const buildCustomFieldMatches = (
  formBindings: ProductScanAmazonFormBindings
): Map<string, ProductCustomFieldDefinition> =>
  new Map(
    formBindings.customFields
      .map((field) => {
        const normalizedLabel = normalizeMetadataLabel(field.name);
        return normalizedLabel === null ? null : [normalizedLabel, field];
      })
      .filter((entry): entry is [string, ProductCustomFieldDefinition] => entry !== null)
  );

const resolveAttributeMapping = (
  entry: AmazonScanMappedField,
  context: AttributeMappingContext
): ScanAttributeMapping | null => {
  const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
  if (normalizedSourceLabel === null) return null;

  return (
    resolveParameterMapping(entry, normalizedSourceLabel, context) ??
    resolveCustomFieldMapping(entry, normalizedSourceLabel, context)
  );
};

const resolveParameterMapping = (
  entry: AmazonScanMappedField,
  normalizedSourceLabel: string,
  context: AttributeMappingContext
): ScanAttributeMapping | null => {
  const parameterMatch = context.parameterByLabel.get(normalizedSourceLabel);
  if (parameterMatch === undefined) return null;

  const targetKey = `parameter:${parameterMatch.id}`;
  if (context.usedTargets.has(targetKey)) return null;
  context.usedTargets.add(targetKey);
  return {
    sourceLabel: entry.sourceLabel,
    targetId: parameterMatch.id,
    targetLabel: parameterMatch.label,
    targetType: 'parameter',
    value: entry.value,
  };
};

const resolveCustomFieldMapping = (
  entry: AmazonScanMappedField,
  normalizedSourceLabel: string,
  context: AttributeMappingContext
): ScanAttributeMapping | null => {
  const field = context.customFieldByLabel.get(normalizedSourceLabel);
  if (field === undefined) return null;

  const targetKey = `custom_field:${field.id}`;
  if (context.usedTargets.has(targetKey)) return null;
  const mapping = resolveCustomFieldMappingValue(entry, field);
  if (mapping !== null) context.usedTargets.add(targetKey);
  return mapping;
};

const resolveCustomFieldMappingValue = (
  entry: AmazonScanMappedField,
  field: ProductCustomFieldDefinition
): ScanAttributeMapping | null => {
  if (field.type !== 'checkbox_set') {
    return {
      sourceLabel: entry.sourceLabel,
      targetId: field.id,
      targetLabel: field.name,
      targetType: 'custom_field_text',
      value: entry.value,
    };
  }

  const optionMatch = resolveCheckboxSetOptionMatch(field, entry.value);
  if (optionMatch === null) return null;
  return {
    sourceLabel: entry.sourceLabel,
    targetId: field.id,
    targetLabel: field.name,
    targetOptionIds: optionMatch.optionIds,
    targetOptionLabels: optionMatch.optionLabels,
    targetType: 'custom_field_checkbox_set',
    value: entry.value,
  };
};

export const resolveUnmappedAmazonFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  mappings: ScanAttributeMapping[]
): AmazonScanMappedField[] => {
  const mappedKeys = new Set(
    mappings.map((mapping) =>
      resolveAmazonMappedFieldKey({
        sourceLabel: mapping.sourceLabel,
        value: mapping.value,
      })
    )
  );
  return buildAmazonMappedFields(scan).filter(
    (entry) => mappedKeys.has(resolveAmazonMappedFieldKey(entry)) === false
  );
};
