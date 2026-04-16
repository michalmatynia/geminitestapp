import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductScanRecord, ProductScanStatus } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { resolveProductScanRunFeedbackPresentation } from '@/features/products/lib/product-scan-run-feedback';

export const STATUS_LABELS: Record<ProductScanStatus | 'enqueuing', string> = {
  enqueuing: 'Enqueuing...',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

export const STATUS_CLASSES: Record<ProductScanStatus | 'enqueuing', string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

export const isManualVerificationPending = (scan: Pick<ProductScanRecord, 'rawResult'> | null | undefined): boolean => {
  const rawResult = scan?.rawResult;
  if (rawResult === null || rawResult === undefined || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['manualVerificationPending'] === true;
};

const resolveStatusFeedbackParams = (scan: ProductScanRecord): Parameters<typeof resolveProductScanRunFeedbackPresentation>[1] => {
  const amazonEval = scan.amazonEvaluation;
  const supplierEval = scan.supplierEvaluation;

  const amazonStatus = typeof amazonEval?.status === 'string' ? amazonEval.status : null;
  const amazonLanguage = typeof amazonEval?.languageAccepted === 'boolean' ? amazonEval.languageAccepted : null;
  const supplierStatus = typeof supplierEval?.status === 'string' ? supplierEval.status : null;

  return {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: (scan.asinUpdateMessage ?? null) !== null ? scan.asinUpdateMessage : null,
    amazonEvaluationStatus: amazonStatus,
    amazonEvaluationLanguageAccepted: amazonLanguage,
    supplierEvaluationStatus: supplierStatus,
  };
};

export const resolveStatusLabel = (scan: ProductScanRecord): string => {
  const params = resolveStatusFeedbackParams(scan);
  return resolveProductScanRunFeedbackPresentation(scan.status, params).label;
};

export const resolveStatusClassName = (scan: ProductScanRecord): string => {
  const params = resolveStatusFeedbackParams(scan);
  return resolveProductScanRunFeedbackPresentation(scan.status, params).badgeClassName ?? STATUS_CLASSES[scan.status];
};

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
  return normalized !== '' ? normalized : null;
};

export const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized !== '' ? normalized : null;
};

export const normalizeMetadataLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeComparableText(value);
  if (normalized === null) {
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

const resolveWeightUnitFactor = (unit: string): number | null => {
  if (unit === 'kg' || unit.startsWith('kilogram')) return 1;
  if (unit === 'g' || unit.startsWith('gram')) return 0.001;
  if (unit === 'oz' || unit === 'ounces' || unit === 'ounce') return 0.0283495;
  if (unit === 'lb' || unit === 'lbs' || unit === 'pounds' || unit === 'pound') return 0.45359237;
  return null;
};

export const parseAmazonWeightKg = (value: string | null | undefined): number | null => {
  const normalizedRaw = normalizeComparableText(value);
  if (normalizedRaw === null) return null;
  const normalized = normalizedRaw.toLowerCase();

  const match = normalized.match(/([\d.,]+)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?|ounces?|oz)\b/i);
  if (match === null) return null;

  const match1 = match[1];
  const amount = Number.parseFloat((match1 ?? '').replace(/,/g, ''));
  if (Number.isFinite(amount) === false || amount <= 0) return null;

  const unit = match[2];
  const factor = resolveWeightUnitFactor(unit !== undefined ? unit.toLowerCase() : '');
  if (factor === null) return null;

  return roundToDecimals(amount * factor, 2);
};

const resolveDimensionFactor = (unit: string): number => {
  const unitLower = unit.toLowerCase();
  if (unitLower === 'cm' || unitLower.startsWith('centimeter') === true) return 1;
  if (unitLower === 'mm' || unitLower.startsWith('millimeter') === true) return 0.1;
  return 2.54;
};

export const parseAmazonDimensionsCm = (
  value: string | null | undefined
): { sizeLength: number; sizeWidth: number; length: number } | null => {
  const normalizedRaw = normalizeComparableText(value);
  if (normalizedRaw === null) return null;
  const normalized = normalizedRaw.toLowerCase();

  const measurementMatch = normalized.match(
    /([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches)\b/i
  );
  if (measurementMatch === null) return null;

  const m1 = measurementMatch[1];
  const m2 = measurementMatch[2];
  const m3 = measurementMatch[3];
  const values = [m1, m2, m3].map((entry) => Number.parseFloat((entry ?? '').replace(/,/g, '')));
  if (values.some((entry) => Number.isFinite(entry) === false || entry <= 0) === true) return null;

  const factor = resolveDimensionFactor(measurementMatch[4] ?? '');

  const val0 = values[0];
  const val1 = values[1];
  const val2 = values[2];

  return {
    sizeLength: roundToDecimals((val0 ?? 0) * factor, 1),
    sizeWidth: roundToDecimals((val1 ?? 0) * factor, 1),
    length: roundToDecimals((val2 ?? 0) * factor, 1),
  };
};

const buildAmazonDetailsBaseFields = (details: NonNullable<ProductScanRecord['amazonDetails']>): AmazonScanMappedField[] => {
  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Brand', value: details.brand },
    { label: 'Manufacturer', value: details.manufacturer },
    { label: 'Model number', value: details.modelNumber },
    { label: 'Part number', value: details.partNumber },
    { label: 'Color', value: details.color },
    { label: 'Style', value: details.style },
    { label: 'Material', value: details.material },
    { label: 'Size', value: details.size },
    { label: 'Pattern', value: details.pattern },
    { label: 'Finish', value: details.finish },
    { label: 'Item dimensions', value: details.itemDimensions },
    { label: 'Package dimensions', value: details.packageDimensions },
    { label: 'Item weight', value: details.itemWeight },
    { label: 'Package weight', value: details.packageWeight },
    { label: 'Best Sellers Rank', value: details.bestSellersRank },
  ];

  return fields
    .map((f) => ({ sourceLabel: f.label, value: f.value ?? '' }))
    .filter((entry): entry is AmazonScanMappedField => normalizeComparableText(entry.value) !== null);
};

export const buildAmazonMappedFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>
): AmazonScanMappedField[] => {
  const details = scan.amazonDetails;
  if (details === undefined || details === null) return [];

  const normalizedEntries = buildAmazonDetailsBaseFields(details);

  const seenLabels = new Set(
    normalizedEntries
      .map((entry) => normalizeMetadataLabel(entry.sourceLabel))
      .filter((entry): entry is string => entry !== null)
  );

  const rawEntries = details.attributes
    .map((entry) => ({
      sourceLabel: entry.label,
      value: entry.value,
    }))
    .filter((entry): entry is AmazonScanMappedField => {
      const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
      return (
        normalizeComparableText(entry.value) !== null &&
        normalizedSourceLabel !== null &&
        seenLabels.has(normalizedSourceLabel) === false
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
  if (sourceEntries.length === 0) return [];

  const mappedKeys = new Set(
    mappings.map((mapping) =>
      resolveAmazonMappedFieldKey({
        sourceLabel: mapping.sourceLabel,
        value: mapping.value,
      })
    )
  );

  return sourceEntries.filter((entry) => mappedKeys.has(resolveAmazonMappedFieldKey(entry)) === false);
};

export const splitMultiValueTokens = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/\s*(?:,|;|\||\/|\band\b)\s*/i)
        .map((entry) => normalizeMetadataLabel(entry))
        .filter((entry): entry is string => entry !== null)
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
        return normalizedLabel !== null
          ? [normalizedLabel, { id: option.id, label: option.label }] as const
          : null;
      })
      .filter((entry): entry is readonly [string, { id: string; label: string }] => entry !== null)
  );

  const exactMatch = normalizeMetadataLabel(sourceValue);
  if (exactMatch !== null) {
    const option = optionsByLabel.get(exactMatch);
    if (option !== undefined) {
      return {
        optionIds: [option.id],
        optionLabels: [option.label],
      };
    }
  }

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

export const haveSameSelectedOptions = (
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined
): boolean => {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  if (leftSet.size !== rightSet.size) return false;
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
    .filter((label): label is string => label !== undefined && normalizeComparableText(label) !== null);

  return labels.length > 0 ? labels.join(', ') : null;
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) === true) return value;
  return parsed.toLocaleString();
};

export const renderScanMeta = (scan: ProductScanRecord): React.JSX.Element | null => {
  const asinValue = scan.asin;
  const asinPart = typeof asinValue === 'string' && asinValue !== '' ? `ASIN ${asinValue}` : null;
  const priceValue = scan.price;
  const pricePart = typeof priceValue === 'string' && priceValue !== '' ? `Price ${priceValue}` : null;
  const parts = [asinPart, pricePart].filter((p): p is string => p !== null);

  if (parts.length === 0) return null;

  return <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p>;
};

export const resolveScanMessages = (
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } => {
  const scanStatus = scan.status;
  const asinMessage = (scan.asinUpdateMessage ?? null) !== null ? scan.asinUpdateMessage : null;
  const scanError = (scan.error ?? null) !== null ? scan.error : null;

  if (scanStatus === 'completed') return { infoMessage: asinMessage, errorMessage: null };
  if (scanStatus === 'no_match') return { infoMessage: asinMessage ?? scanError, errorMessage: null };
  if (scanStatus === 'conflict' || scanStatus === 'failed') return { infoMessage: null, errorMessage: scanError ?? asinMessage };

  if (isProductScanActiveStatus(scanStatus)) {
    return {
      infoMessage: asinMessage ?? resolveActiveStatusMessage(scanStatus),
      errorMessage: scanError,
    };
  }

  return {
    infoMessage: asinMessage,
    errorMessage: scanError,
  };
};
