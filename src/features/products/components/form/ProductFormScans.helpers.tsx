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

  const result = rawResult as Record<string, unknown>;
  return result['manualVerificationPending'] === true;
};

const resolveStatusFeedbackParams = (scan: ProductScanRecord): Parameters<typeof resolveProductScanRunFeedbackPresentation>[1] => {
  const amazonEval = scan.amazonEvaluation;
  const supplierEval = scan.supplierEvaluation;

  return {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: (scan.asinUpdateMessage ?? null) !== null ? scan.asinUpdateMessage : null,
    amazonEvaluationStatus: typeof amazonEval?.status === 'string' ? amazonEval.status : null,
    amazonEvaluationLanguageAccepted: typeof amazonEval?.languageAccepted === 'boolean' ? amazonEval.languageAccepted : null,
    supplierEvaluationStatus: typeof supplierEval?.status === 'string' ? supplierEval.status : null,
  };
};

export const resolveStatusLabel = (scan: ProductScanRecord): string =>
  resolveProductScanRunFeedbackPresentation(scan.status, resolveStatusFeedbackParams(scan)).label;

export const resolveStatusClassName = (scan: ProductScanRecord): string =>
  resolveProductScanRunFeedbackPresentation(scan.status, resolveStatusFeedbackParams(scan)).badgeClassName ?? STATUS_CLASSES[scan.status];

export const resolveActiveStatusMessage = (status: ProductScanStatus): string | null => {
  if (status === 'queued') return 'Amazon reverse image scan queued.';
  if (status === 'running') return 'Amazon reverse image scan running.';
  return null;
};

export const normalizeComparableAsin = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized !== '' ? normalized : null;
};

export const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized !== '' ? normalized : null;
};

export const normalizeMetadataLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeComparableText(value);
  if (normalized === null) return null;
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

const WEIGHT_UNIT_FACTORS: Record<string, number> = {
  kg: 1, kilogram: 1,
  g: 0.001, gram: 0.001,
  oz: 0.0283495, ounce: 0.0283495,
  lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237,
};

export const parseAmazonWeightKg = (value: string | null | undefined): number | null => {
  const raw = normalizeComparableText(value);
  if (raw === null) return null;
  const match = raw.toLowerCase().match(/([\d.,]+)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?|ounces?|oz)\b/i);
  if (match === null) return null;

  const m1 = match[1];
  const m2 = match[2];
  const amount = Number.parseFloat((m1 ?? '').replace(/,/g, ''));
  if (Number.isFinite(amount) === false || amount <= 0) return null;

  const unitRaw = (m2 ?? '').toLowerCase();
  const unit = Object.keys(WEIGHT_UNIT_FACTORS).find((u) => unitRaw.startsWith(u));
  return unit !== undefined ? roundToDecimals(amount * (WEIGHT_UNIT_FACTORS[unit] ?? 0), 2) : null;
};

function resolveDimensionFactor(unit: string): number {
  if (unit.startsWith('cm') || unit.startsWith('centimeter')) return 1;
  if (unit.startsWith('mm') || unit.startsWith('millimeter')) return 0.1;
  return 2.54;
}

export const parseAmazonDimensionsCm = (
  value: string | null | undefined
): { sizeLength: number; sizeWidth: number; length: number } | null => {
  const raw = normalizeComparableText(value);
  if (raw === null) return null;
  const match = raw.toLowerCase().match(/([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches)\b/i);
  if (match === null) return null;

  const vals = [match[1], match[2], match[3]].map((v) => Number.parseFloat((v ?? '').replace(/,/g, '')));
  if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null;

  const factor = resolveDimensionFactor((match[4] ?? '').toLowerCase());
  const [l, w, len] = vals;
  if (l === undefined || w === undefined || len === undefined) return null;

  return { sizeLength: roundToDecimals(l * factor, 1), sizeWidth: roundToDecimals(w * factor, 1), length: roundToDecimals(len * factor, 1) };
};

const buildAmazonDetailsBaseFields = (details: NonNullable<ProductScanRecord['amazonDetails']>): AmazonScanMappedField[] => {
  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Brand', value: details.brand }, { label: 'Manufacturer', value: details.manufacturer },
    { label: 'Model number', value: details.modelNumber }, { label: 'Part number', value: details.partNumber },
    { label: 'Color', value: details.color }, { label: 'Style', value: details.style },
    { label: 'Material', value: details.material }, { label: 'Size', value: details.size },
    { label: 'Pattern', value: details.pattern }, { label: 'Finish', value: details.finish },
    { label: 'Item dimensions', value: details.itemDimensions }, { label: 'Package dimensions', value: details.packageDimensions },
    { label: 'Item weight', value: details.itemWeight }, { label: 'Package weight', value: details.packageWeight },
    { label: 'Best Sellers Rank', value: details.bestSellersRank },
  ];

  return fields.map((f) => ({ sourceLabel: f.label, value: f.value ?? '' }))
    .filter((entry): entry is AmazonScanMappedField => normalizeComparableText(entry.value) !== null);
};

export const buildAmazonMappedFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>
): AmazonScanMappedField[] => {
  const details = scan.amazonDetails;
  if (details === undefined || details === null) return [];

  const normalizedEntries = buildAmazonDetailsBaseFields(details);
  const seenLabels = new Set(normalizedEntries.map((e) => normalizeMetadataLabel(e.sourceLabel)).filter((l): l is string => l !== null));

  const rawEntries = details.attributes.map((e) => ({ sourceLabel: e.label, value: e.value }))
    .filter((entry): entry is AmazonScanMappedField => {
      const label = normalizeMetadataLabel(entry.sourceLabel);
      return normalizeComparableText(entry.value) !== null && label !== null && !seenLabels.has(label);
    });

  return [...normalizedEntries, ...rawEntries];
};

export const resolveAmazonMappedFieldKey = (field: AmazonScanMappedField): string =>
  [normalizeMetadataLabel(field.sourceLabel) ?? field.sourceLabel.trim().toLowerCase(), normalizeComparableText(field.value) ?? ''].join('::');

export const resolveUnmappedAmazonFields = (
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  mappings: ScanAttributeMapping[]
): AmazonScanMappedField[] => {
  const sourceEntries = buildAmazonMappedFields(scan);
  if (sourceEntries.length === 0) return [];

  const mappedKeys = new Set(mappings.map((m) => resolveAmazonMappedFieldKey({ sourceLabel: m.sourceLabel, value: m.value })));
  return sourceEntries.filter((entry) => !mappedKeys.has(resolveAmazonMappedFieldKey(entry)));
};

export const splitMultiValueTokens = (value: string): string[] =>
  Array.from(new Set(value.split(/\s*(?:,|;|\||\/|\band\b)\s*/i).map((e) => normalizeMetadataLabel(e)).filter((e): e is string => e !== null)));

export const resolveCheckboxSetOptionMatch = (
  field: ProductCustomFieldDefinition,
  sourceValue: string
): { optionIds: string[]; optionLabels: string[] } | null => {
  const optionsMap = new Map(field.options.map((o) => {
    const label = normalizeMetadataLabel(o.label);
    return label !== null ? [label, { id: o.id, label: o.label }] as const : null;
  }).filter((entry): entry is readonly [string, { id: string; label: string }] => entry !== null));

  const exact = normalizeMetadataLabel(sourceValue);
  const exactOption = exact !== null ? optionsMap.get(exact) : undefined;
  if (exactOption !== undefined) return { optionIds: [exactOption.id], optionLabels: [exactOption.label] };

  const tokens = splitMultiValueTokens(sourceValue);
  if (tokens.length < 2) return null;

  const matched = tokens.map((t) => optionsMap.get(t)).filter((o): o is { id: string; label: string } => o !== undefined);
  if (matched.length !== tokens.length) return null;

  return { optionIds: matched.map((o) => o.id), optionLabels: matched.map((o) => o.label) };
};

export const haveSameSelectedOptions = (
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined
): boolean => {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
};

export const formatCustomFieldSelectedOptionLabels = (
  field: ProductCustomFieldDefinition,
  optionIds: readonly string[] | null | undefined
): string | null => {
  if (field.type !== 'checkbox_set' || !Array.isArray(optionIds) || optionIds.length === 0) return null;

  const labelMap = new Map<string, string>(field.options.map((o) => [o.id, o.label]));
  const labels = optionIds.filter((id): id is string => typeof id === 'string')
    .map((id) => labelMap.get(id))
    .filter((label): label is string => label !== undefined && normalizeComparableText(label) !== null);

  return labels.length > 0 ? labels.join(', ') : null;
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export const renderScanMeta = (scan: ProductScanRecord): React.JSX.Element | null => {
  const asinValue = scan.asin;
  const asinPart = typeof asinValue === 'string' && asinValue !== '' ? `ASIN ${asinValue}` : null;
  const priceValue = scan.price;
  const pricePart = typeof priceValue === 'string' && priceValue !== '' ? `Price ${priceValue}` : null;
  const parts = [asinPart, pricePart].filter((p): p is string => p !== null);
  return parts.length > 0 ? <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p> : null;
};

export const resolveScanMessages = (
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } => {
  const asinMsg = (scan.asinUpdateMessage ?? null) !== null ? scan.asinUpdateMessage : null;
  const scanErr = (scan.error ?? null) !== null ? scan.error : null;

  if (scan.status === 'completed') return { infoMessage: asinMsg, errorMessage: null };
  if (scan.status === 'no_match') return { infoMessage: asinMsg ?? scanErr, errorMessage: null };
  if (scan.status === 'conflict' || scan.status === 'failed') return { infoMessage: null, errorMessage: scanErr ?? asinMsg };

  const activeMsg = isProductScanActiveStatus(scan.status) ? (asinMsg ?? resolveActiveStatusMessage(scan.status)) : asinMsg;
  return { infoMessage: activeMsg, errorMessage: scanErr };
};
