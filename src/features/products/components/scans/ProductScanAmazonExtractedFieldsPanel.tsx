'use client';

import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { Button } from '@/shared/ui/button';

import {
  hasProductScanAmazonDetails,
  ProductScanAmazonQualitySummary,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonDetails,
} from './ProductScanAmazonDetails';

type AmazonScanMappedField = {
  sourceLabel: string;
  value: string;
};

type ScanAttributeMapping =
  | {
      targetType: 'parameter';
      targetId: string;
      targetLabel: string;
      sourceLabel: string;
      value: string;
    }
  | {
      targetType: 'custom_field_text';
      targetId: string;
      targetLabel: string;
      sourceLabel: string;
      value: string;
    }
  | {
      targetType: 'custom_field_checkbox_set';
      targetId: string;
      targetLabel: string;
      sourceLabel: string;
      value: string;
      targetOptionIds: string[];
      targetOptionLabels: string[];
    };

export type ProductScanAmazonFormBindings = {
  getTextFieldValue: (field: 'asin' | 'ean' | 'gtin') => string | null | undefined;
  getNumberFieldValue: (
    field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length'
  ) => number | null | undefined;
  applyTextField: (field: 'asin' | 'ean' | 'gtin', value: string) => void;
  applyNumberField: (
    field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length',
    value: number
  ) => void;
  parameters: ProductParameter[];
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  customFields: ProductCustomFieldDefinition[];
  customFieldValues: ProductCustomFieldValue[];
  setTextValue: (fieldId: string, value: string) => void;
  toggleSelectedOption: (fieldId: string, optionId: string, checked: boolean) => void;
};

const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeMetadataLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const parseAmazonWeightKg = (value: string | null | undefined): number | null => {
  const normalized = normalizeComparableText(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/([\d.,]+)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?|ounces?|oz)\b/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = (match[2] ?? '').toLowerCase();
  if (unit === 'kg' || unit.startsWith('kilogram')) {
    return roundToDecimals(amount, 2);
  }
  if (unit === 'g' || unit.startsWith('gram')) {
    return roundToDecimals(amount / 1000, 2);
  }
  if (unit === 'oz' || unit === 'ounces' || unit === 'ounce') {
    return roundToDecimals(amount * 0.0283495, 2);
  }
  return roundToDecimals(amount * 0.45359237, 2);
};

const parseAmazonDimensionsCm = (
  value: string | null | undefined
): { sizeLength: number; sizeWidth: number; length: number } | null => {
  const normalized = normalizeComparableText(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  const measurementMatch = normalized.match(
    /([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches)\b/i
  );
  if (!measurementMatch) {
    return null;
  }

  const values = measurementMatch
    .slice(1, 4)
    .map((entry) => Number.parseFloat((entry ?? '').replace(/,/g, '')));
  if (values.some((entry) => !Number.isFinite(entry) || entry <= 0)) {
    return null;
  }

  const unit = measurementMatch[4]?.toLowerCase();
  const factor =
    unit === 'cm' || unit?.startsWith('centimeter')
      ? 1
      : unit === 'mm' || unit?.startsWith('millimeter')
        ? 0.1
        : 2.54;

  return {
    sizeLength: roundToDecimals(values[0]! * factor, 1),
    sizeWidth: roundToDecimals(values[1]! * factor, 1),
    length: roundToDecimals(values[2]! * factor, 1),
  };
};

const buildAmazonMappedFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>
): AmazonScanMappedField[] => {
  const details = scan.amazonDetails;
  if (!details) {
    return [];
  }

  const normalizedEntries: AmazonScanMappedField[] = [
    { sourceLabel: 'Brand', value: details.brand ?? '' },
    { sourceLabel: 'Manufacturer', value: details.manufacturer ?? '' },
    { sourceLabel: 'Model number', value: details.modelNumber ?? '' },
    { sourceLabel: 'Part number', value: details.partNumber ?? '' },
    { sourceLabel: 'Color', value: details.color ?? '' },
    { sourceLabel: 'Style', value: details.style ?? '' },
    { sourceLabel: 'Material', value: details.material ?? '' },
    { sourceLabel: 'Size', value: details.size ?? '' },
    { sourceLabel: 'Pattern', value: details.pattern ?? '' },
    { sourceLabel: 'Finish', value: details.finish ?? '' },
    { sourceLabel: 'Item dimensions', value: details.itemDimensions ?? '' },
    { sourceLabel: 'Package dimensions', value: details.packageDimensions ?? '' },
    { sourceLabel: 'Item weight', value: details.itemWeight ?? '' },
    { sourceLabel: 'Package weight', value: details.packageWeight ?? '' },
    { sourceLabel: 'Best Sellers Rank', value: details.bestSellersRank ?? '' },
  ].filter((entry): entry is AmazonScanMappedField => Boolean(normalizeComparableText(entry.value)));

  const seenLabels = new Set(
    normalizedEntries
      .map((entry) => normalizeMetadataLabel(entry.sourceLabel))
      .filter((entry): entry is string => Boolean(entry))
  );

  const rawEntries = details.attributes
    .map((entry) => ({
      sourceLabel: entry.label,
      value: entry.value,
    }))
    .filter((entry): entry is AmazonScanMappedField => {
      const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
      return (
        Boolean(normalizeComparableText(entry.value)) &&
        Boolean(normalizedSourceLabel) &&
        !seenLabels.has(normalizedSourceLabel!)
      );
    });

  return [...normalizedEntries, ...rawEntries];
};

const resolveAmazonMappedFieldKey = (field: AmazonScanMappedField): string =>
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
        .filter((entry): entry is string => Boolean(entry))
    )
  );

const resolveCheckboxSetOptionMatch = (
  field: ProductCustomFieldDefinition,
  sourceValue: string
): { optionIds: string[]; optionLabels: string[] } | null => {
  const optionsByLabel = new Map(
    field.options
      .map((option) => {
        const normalizedLabel = normalizeMetadataLabel(option.label);
        return normalizedLabel
          ? [normalizedLabel, { id: option.id, label: option.label }]
          : null;
      })
      .filter((entry): entry is [string, { id: string; label: string }] => Boolean(entry))
  );

  const exactMatch = normalizeMetadataLabel(sourceValue);
  if (exactMatch) {
    const option = optionsByLabel.get(exactMatch);
    if (option) {
      return {
        optionIds: [option.id],
        optionLabels: [option.label],
      };
    }
  }

  const tokens = splitMultiValueTokens(sourceValue);
  if (tokens.length < 2) {
    return null;
  }

  const matchedOptions = tokens
    .map((token) => optionsByLabel.get(token))
    .filter((option): option is { id: string; label: string } => Boolean(option));

  if (matchedOptions.length !== tokens.length) {
    return null;
  }

  return {
    optionIds: matchedOptions.map((option) => option.id),
    optionLabels: matchedOptions.map((option) => option.label),
  };
};

const haveSameSelectedOptions = (
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined
): boolean => {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  return [...leftSet].every((value) => rightSet.has(value));
};

const formatCustomFieldSelectedOptionLabels = (
  field: ProductCustomFieldDefinition,
  optionIds: readonly string[] | null | undefined
): string | null => {
  if (field.type !== 'checkbox_set' || !Array.isArray(optionIds) || optionIds.length === 0) {
    return null;
  }

  const labelByOptionId = new Map<string, string>(
    field.options.map((option) => [option.id, option.label])
  );
  const normalizedOptionIds = optionIds.filter((optionId): optionId is string => typeof optionId === 'string');
  const labels = normalizedOptionIds
    .map((optionId) => labelByOptionId.get(optionId))
    .filter((label): label is string => Boolean(normalizeComparableText(label)));

  return labels.length > 0 ? labels.join(', ') : null;
};

const buildAttributeMappings = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  formBindings: ProductScanAmazonFormBindings
): ScanAttributeMapping[] => {
  const sourceEntries = buildAmazonMappedFields(scan);
  if (sourceEntries.length === 0) {
    return [];
  }

  const parameterByLabel = new Map(
    formBindings.parameters
      .map((parameter) => {
        const normalizedLabel =
          normalizeMetadataLabel(parameter.name_en) ??
          normalizeMetadataLabel(parameter.name_pl) ??
          normalizeMetadataLabel(parameter.name_de);
        return normalizedLabel
          ? [
              normalizedLabel,
              {
                id: parameter.id,
                label: parameter.name_en || parameter.name_pl || parameter.name_de || 'Parameter',
              },
            ]
          : null;
      })
      .filter((entry): entry is [string, { id: string; label: string }] => Boolean(entry))
  );

  const customFieldByLabel = new Map(
    formBindings.customFields
      .map((field) => {
        const normalizedLabel = normalizeMetadataLabel(field.name);
        return normalizedLabel ? [normalizedLabel, field] : null;
      })
      .filter((entry): entry is [string, ProductCustomFieldDefinition] => Boolean(entry))
  );

  const usedTargets = new Set<string>();
  const mappings: ScanAttributeMapping[] = [];

  for (const entry of sourceEntries) {
    const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
    if (!normalizedSourceLabel) {
      continue;
    }

    const parameterMatch = parameterByLabel.get(normalizedSourceLabel);
    if (parameterMatch) {
      const targetKey = `parameter:${parameterMatch.id}`;
      if (!usedTargets.has(targetKey)) {
        usedTargets.add(targetKey);
        mappings.push({
          targetType: 'parameter',
          targetId: parameterMatch.id,
          targetLabel: parameterMatch.label,
          sourceLabel: entry.sourceLabel,
          value: entry.value,
        });
      }
      continue;
    }

    const customFieldMatch = customFieldByLabel.get(normalizedSourceLabel);
    if (customFieldMatch) {
      const targetKey = `custom_field:${customFieldMatch.id}`;
      if (!usedTargets.has(targetKey)) {
        usedTargets.add(targetKey);
        if (customFieldMatch.type === 'checkbox_set') {
          const optionMatch = resolveCheckboxSetOptionMatch(customFieldMatch, entry.value);
          if (optionMatch) {
            mappings.push({
              targetType: 'custom_field_checkbox_set',
              targetId: customFieldMatch.id,
              targetLabel: customFieldMatch.name,
              sourceLabel: entry.sourceLabel,
              value: entry.value,
              targetOptionIds: optionMatch.optionIds,
              targetOptionLabels: optionMatch.optionLabels,
            });
          } else {
            usedTargets.delete(targetKey);
          }
        } else {
          mappings.push({
            targetType: 'custom_field_text',
            targetId: customFieldMatch.id,
            targetLabel: customFieldMatch.name,
            sourceLabel: entry.sourceLabel,
            value: entry.value,
          });
        }
      }
    }
  }

  return mappings;
};

const resolveUnmappedAmazonFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  mappings: ScanAttributeMapping[]
): AmazonScanMappedField[] => {
  const sourceEntries = buildAmazonMappedFields(scan);
  if (sourceEntries.length === 0) {
    return [];
  }

  const mappedKeys = new Set(
    mappings.map((mapping) =>
      resolveAmazonMappedFieldKey({
        sourceLabel: mapping.sourceLabel,
        value: mapping.value,
      })
    )
  );

  return sourceEntries.filter((entry) => !mappedKeys.has(resolveAmazonMappedFieldKey(entry)));
};

const applyMatchedAttributeMappings = (
  mappings: ScanAttributeMapping[],
  formBindings: ProductScanAmazonFormBindings
): void => {
  const parameterValueCount = formBindings.parameterValues.length;
  let queuedParameterAdds = 0;

  for (const mapping of mappings) {
    if (mapping.targetType === 'parameter') {
      const existingIndex = formBindings.parameterValues.findIndex(
        (entry) => entry.parameterId === mapping.targetId
      );
      if (existingIndex >= 0) {
        formBindings.updateParameterValue(existingIndex, mapping.value);
        continue;
      }

      const nextIndex = parameterValueCount + queuedParameterAdds;
      queuedParameterAdds += 1;
      formBindings.addParameterValue();
      formBindings.updateParameterId(nextIndex, mapping.targetId);
      formBindings.updateParameterValue(nextIndex, mapping.value);
      continue;
    }

    if (mapping.targetType === 'custom_field_text') {
      formBindings.setTextValue(mapping.targetId, mapping.value);
      continue;
    }

    const currentSelectedOptionIds =
      formBindings.customFieldValues.find((entry) => entry.fieldId === mapping.targetId)?.selectedOptionIds ?? [];
    const currentSelectedOptionIdSet = new Set(currentSelectedOptionIds);
    const targetOptionIdSet = new Set(mapping.targetOptionIds);
    const targetField = formBindings.customFields.find((field) => field.id === mapping.targetId);
    if (targetField?.type !== 'checkbox_set') {
      continue;
    }

    for (const option of targetField.options) {
      const shouldBeChecked = targetOptionIdSet.has(option.id);
      if (currentSelectedOptionIdSet.has(option.id) !== shouldBeChecked) {
        formBindings.toggleSelectedOption(mapping.targetId, option.id, shouldBeChecked);
      }
    }
  }
};

const isAttributeMappingPending = (
  mapping: ScanAttributeMapping,
  formBindings: ProductScanAmazonFormBindings
): boolean => {
  if (mapping.targetType === 'parameter') {
    const existingValue = formBindings.parameterValues.find(
      (entry) => entry.parameterId === mapping.targetId
    )?.value;
    return normalizeComparableText(existingValue) !== normalizeComparableText(mapping.value);
  }

  const existingValue = formBindings.customFieldValues.find(
    (entry) => entry.fieldId === mapping.targetId
  );
  if (mapping.targetType === 'custom_field_text') {
    return normalizeComparableText(existingValue?.textValue) !== normalizeComparableText(mapping.value);
  }

  return !haveSameSelectedOptions(existingValue?.selectedOptionIds, mapping.targetOptionIds);
};

const getAttributeMappingCurrentValue = (
  mapping: ScanAttributeMapping,
  formBindings: ProductScanAmazonFormBindings
): string | null => {
  if (mapping.targetType === 'parameter') {
    return (
      normalizeComparableText(
        formBindings.parameterValues.find((entry) => entry.parameterId === mapping.targetId)?.value
      ) ?? null
    );
  }

  const existingValue = formBindings.customFieldValues.find((entry) => entry.fieldId === mapping.targetId);
  if (mapping.targetType === 'custom_field_text') {
    return normalizeComparableText(existingValue?.textValue) ?? null;
  }

  const targetField = formBindings.customFields.find((field) => field.id === mapping.targetId);
  if (targetField?.type !== 'checkbox_set') {
    return null;
  }

  return formatCustomFieldSelectedOptionLabels(targetField, existingValue?.selectedOptionIds);
};

export function ProductScanAmazonExtractedFieldsPanel(props: {
  scan: ProductScanRecord;
  formBindings?: ProductScanAmazonFormBindings | null;
}): React.JSX.Element | null {
  const { scan, formBindings = null } = props;

  if (!hasProductScanAmazonDetails(scan.amazonDetails) && !normalizeComparableText(scan.asin)) {
    return null;
  }

  const parsedDimensions = parseAmazonDimensionsCm(
    scan.amazonDetails?.itemDimensions ?? scan.amazonDetails?.packageDimensions ?? null
  );
  const parsedWeight = parseAmazonWeightKg(
    scan.amazonDetails?.itemWeight ?? scan.amazonDetails?.packageWeight ?? null
  );

  const currentAsin = formBindings ? normalizeComparableText(formBindings.getTextFieldValue('asin') ?? null) : null;
  const currentEan = formBindings ? normalizeComparableText(formBindings.getTextFieldValue('ean') ?? null) : null;
  const currentGtin = formBindings ? normalizeComparableText(formBindings.getTextFieldValue('gtin') ?? null) : null;
  const currentWeight = formBindings ? formBindings.getNumberFieldValue('weight') ?? null : null;
  const currentSizeLength = formBindings ? formBindings.getNumberFieldValue('sizeLength') ?? null : null;
  const currentSizeWidth = formBindings ? formBindings.getNumberFieldValue('sizeWidth') ?? null : null;
  const currentHeight = formBindings ? formBindings.getNumberFieldValue('length') ?? null : null;

  const attributeMappings = formBindings ? buildAttributeMappings(scan, formBindings) : [];
  const unmappedFields = formBindings ? resolveUnmappedAmazonFields(scan, attributeMappings) : [];
  const pendingAttributeMappings = formBindings
    ? attributeMappings.filter((mapping) => isAttributeMappingPending(mapping, formBindings))
    : [];

  const canApplyDimensions =
    formBindings &&
    parsedDimensions != null &&
    (currentSizeLength !== parsedDimensions.sizeLength ||
      currentSizeWidth !== parsedDimensions.sizeWidth ||
      currentHeight !== parsedDimensions.length);
  const canApplyWeight = formBindings && parsedWeight != null && currentWeight !== parsedWeight;

  return (
    <div className='space-y-3'>
      <ProductScanAmazonQualitySummary scan={scan} />
      <ProductScanAmazonProvenanceSummary scan={scan} />
      {formBindings ? (
        <>
          <div className='flex flex-wrap gap-2'>
            {scan.asin ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentAsin === scan.asin}
                onClick={() => formBindings.applyTextField('asin', scan.asin ?? '')}
                className='h-7 px-2 text-xs'
              >
                Use ASIN
              </Button>
            ) : null}
            {scan.amazonDetails?.ean ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentEan === scan.amazonDetails.ean}
                onClick={() => formBindings.applyTextField('ean', scan.amazonDetails?.ean ?? '')}
                className='h-7 px-2 text-xs'
              >
                Use EAN
              </Button>
            ) : null}
            {scan.amazonDetails?.gtin ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentGtin === scan.amazonDetails.gtin}
                onClick={() => formBindings.applyTextField('gtin', scan.amazonDetails?.gtin ?? '')}
                className='h-7 px-2 text-xs'
              >
                Use GTIN
              </Button>
            ) : null}
            {parsedWeight != null ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplyWeight}
                onClick={() => formBindings.applyNumberField('weight', parsedWeight)}
                className='h-7 px-2 text-xs'
              >
                Use Weight
              </Button>
            ) : null}
            {parsedDimensions ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplyDimensions}
                onClick={() => {
                  formBindings.applyNumberField('sizeLength', parsedDimensions.sizeLength);
                  formBindings.applyNumberField('sizeWidth', parsedDimensions.sizeWidth);
                  formBindings.applyNumberField('length', parsedDimensions.length);
                }}
                className='h-7 px-2 text-xs'
              >
                Use Dimensions
              </Button>
            ) : null}
            {attributeMappings.length > 0 ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={pendingAttributeMappings.length === 0}
                onClick={() => applyMatchedAttributeMappings(pendingAttributeMappings, formBindings)}
                className='h-7 px-2 text-xs'
              >
                Apply matched attributes
              </Button>
            ) : null}
          </div>
          {attributeMappings.length > 0 ? (
            <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Matched product metadata targets
              </p>
              <ul className='space-y-1 text-xs text-muted-foreground'>
                {attributeMappings.map((mapping) => {
                  const isPending = isAttributeMappingPending(mapping, formBindings);
                  const currentValue = getAttributeMappingCurrentValue(mapping, formBindings);
                  const mappingLabel = `${mapping.sourceLabel} -> ${
                    mapping.targetType === 'parameter' ? 'Parameter' : 'Custom field'
                  }: ${mapping.targetLabel}${
                    mapping.targetType === 'custom_field_checkbox_set' &&
                    mapping.targetOptionLabels.length > 0
                      ? ` [${mapping.targetOptionLabels.join(', ')}]`
                      : ''
                  }`;

                  return (
                    <li
                      key={`${mapping.targetType}-${mapping.targetId}`}
                      className='flex items-start justify-between gap-3'
                    >
                      <div className='min-w-0 space-y-1'>
                        <p>{mappingLabel}</p>
                        <p className='text-[11px] text-muted-foreground'>
                          Current: {currentValue ?? 'Not set'}
                        </p>
                        <p className='text-[11px] text-muted-foreground'>Amazon: {mapping.value}</p>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        disabled={!isPending}
                        onClick={() => applyMatchedAttributeMappings([mapping], formBindings)}
                        aria-label={`Apply ${mapping.sourceLabel} mapping`}
                        className='h-6 px-2 text-[11px]'
                      >
                        Apply
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {unmappedFields.length > 0 ? (
            <div className='space-y-1 rounded-md border border-amber-500/30 bg-background/70 px-3 py-2'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Unmapped extracted attributes
                </p>
                <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                  {unmappedFields.length} unmapped
                </span>
              </div>
              <ul className='space-y-1 text-xs text-muted-foreground'>
                {unmappedFields.map((field, index) => (
                  <li
                    key={`${resolveAmazonMappedFieldKey(field)}-${index}`}
                    className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'
                  >
                    <p>{field.sourceLabel}</p>
                    <p className='text-[11px] text-muted-foreground'>Amazon: {field.value}</p>
                    <p className='text-[11px] text-amber-300'>No matching product target yet.</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
      <ProductScanAmazonDetails scan={scan} />
    </div>
  );
}
