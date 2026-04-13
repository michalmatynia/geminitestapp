'use client';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductScanRecord, ProductScanStatus } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { resolveProductScanRunFeedbackPresentation } from '@/features/products/lib/product-scan-run-feedback';

export const STATUS_LABELS: Record<ProductScanStatus, string> = {
  enqueuing: 'Enqueuing...',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

export const STATUS_CLASSES: Record<ProductScanStatus, string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

export const isManualVerificationPending = (scan: Pick<ProductScanRecord, 'rawResult'>): boolean => {
  const rawResult = scan.rawResult;
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['manualVerificationPending'] === true;
};

export const resolveStatusLabel = (scan: ProductScanRecord): string =>
  resolveProductScanRunFeedbackPresentation(scan.status, {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: scan.asinUpdateMessage ?? null,
    amazonEvaluationStatus: scan.amazonEvaluation?.status ?? null,
    amazonEvaluationLanguageAccepted: scan.amazonEvaluation?.languageAccepted ?? null,
    supplierEvaluationStatus: scan.supplierEvaluation?.status ?? null,
  }).label;

export const resolveStatusClassName = (scan: ProductScanRecord): string =>
  resolveProductScanRunFeedbackPresentation(scan.status, {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: scan.asinUpdateMessage ?? null,
    amazonEvaluationStatus: scan.amazonEvaluation?.status ?? null,
    amazonEvaluationLanguageAccepted: scan.amazonEvaluation?.languageAccepted ?? null,
    supplierEvaluationStatus: scan.supplierEvaluation?.status ?? null,
  }).badgeClassName ?? STATUS_CLASSES[scan.status];

export const resolveActiveStatusMessage = (status: ProductScanStatus): string | null => {
  if (status === 'queued') {
    return 'Amazon reverse image scan queued.';
  }

  if (status === 'running') {
    return 'Amazon reverse image scan running.';
  }

  return null;
};

export const normalizeComparableAsin = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeMetadataLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

export type AmazonScanMappedField = {
  sourceLabel: string;
  value: string;
};

export type ScanAttributeMapping =
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

export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const parseAmazonWeightKg = (value: string | null | undefined): number | null => {
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

export const parseAmazonDimensionsCm = (
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

export const buildAmazonMappedFields = (
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

export const resolveAmazonMappedFieldKey = (field: AmazonScanMappedField): string =>
  [
    normalizeMetadataLabel(field.sourceLabel) ?? field.sourceLabel.trim().toLowerCase(),
    normalizeComparableText(field.value) ?? '',
  ].join('::');

export const resolveUnmappedAmazonFields = (
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

export const splitMultiValueTokens = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/\s*(?:,|;|\||\/|\band\b)\s*/i)
        .map((entry) => normalizeMetadataLabel(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );

export const resolveCheckboxSetOptionMatch = (
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

export const haveSameSelectedOptions = (
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

export const formatCustomFieldSelectedOptionLabels = (
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

export const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const renderScanMeta = (scan: ProductScanRecord): React.JSX.Element | null => {
  const parts = [scan.asin && `ASIN ${scan.asin}`, scan.price && `Price ${scan.price}`].filter(
    Boolean
  );

  if (parts.length === 0) {
    return null;
  }

  return <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p>;
};

export const resolveScanMessages = (
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } => {
  if (scan.status === 'completed') {
    return {
      infoMessage: scan.asinUpdateMessage,
      errorMessage: null,
    };
  }

  if (scan.status === 'no_match') {
    return {
      infoMessage: scan.asinUpdateMessage ?? scan.error,
      errorMessage: null,
    };
  }

  if (scan.status === 'conflict' || scan.status === 'failed') {
    return {
      infoMessage: null,
      errorMessage: scan.error ?? scan.asinUpdateMessage,
    };
  }

  if (isProductScanActiveStatus(scan.status)) {
    return {
      infoMessage: scan.asinUpdateMessage ?? resolveActiveStatusMessage(scan.status),
      errorMessage: scan.error,
    };
  }

  return {
    infoMessage: scan.asinUpdateMessage,
    errorMessage: scan.error,
  };
};
