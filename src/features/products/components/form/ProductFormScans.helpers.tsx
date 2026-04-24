import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type {
  ProductScanAmazonEvaluationStatus,
  ProductScanRecord,
  ProductScanStatus,
  ProductScanSupplierEvaluationStatus,
} from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import {
  isProductScanCandidateSelectionRequired,
  PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
  isProductScanGoogleStealthRetrying,
  PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE,
  resolveProductScanRunFeedbackPresentation,
} from '@/features/products/lib/product-scan-run-feedback';

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

export function isManualVerificationPending(scan: Pick<ProductScanRecord, 'rawResult'> | null | undefined): boolean {
  const rawResult = scan?.rawResult;
  if (rawResult === null || rawResult === undefined || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  const result = rawResult as Record<string, unknown>;
  return result['manualVerificationPending'] === true;
}

function resolveAmazonEvalStatus(
  evalObj: { status: ProductScanAmazonEvaluationStatus } | null | undefined
): ProductScanAmazonEvaluationStatus | null {
  return typeof evalObj?.status === 'string' ? evalObj.status : null;
}

function resolveSupplierEvalStatus(
  evalObj: { status: ProductScanSupplierEvaluationStatus } | null | undefined
): ProductScanSupplierEvaluationStatus | null {
  return typeof evalObj?.status === 'string' ? evalObj.status : null;
}

function resolveStatusFeedbackParams(scan: ProductScanRecord): Parameters<typeof resolveProductScanRunFeedbackPresentation>[1] {
  const amazonEval = scan.amazonEvaluation;
  const supplierEval = scan.supplierEvaluation;

  const amazonStatus = resolveAmazonEvalStatus(amazonEval);
  const amazonLanguage = typeof amazonEval?.languageAccepted === 'boolean' ? amazonEval.languageAccepted : null;

  return {
    manualVerificationPending: isManualVerificationPending(scan),
    manualVerificationMessage: scan.asinUpdateMessage ?? null,
    googleStealthRetrying: isProductScanGoogleStealthRetrying(scan),
    candidateSelectionRequired: isProductScanCandidateSelectionRequired(scan),
    amazonEvaluationStatus: amazonStatus,
    amazonEvaluationLanguageAccepted: amazonLanguage,
    supplierEvaluationStatus: resolveSupplierEvalStatus(supplierEval),
  };
}

export function resolveStatusLabel(scan: ProductScanRecord): string {
  return resolveProductScanRunFeedbackPresentation(scan.status, resolveStatusFeedbackParams(scan)).label;
}

export function resolveStatusClassName(scan: ProductScanRecord): string {
  const badge = resolveProductScanRunFeedbackPresentation(scan.status, resolveStatusFeedbackParams(scan)).badgeClassName;
  return badge ?? STATUS_CLASSES[scan.status];
}

export function resolveActiveStatusMessage(scan: ProductScanRecord): string | null {
  if (isProductScanGoogleStealthRetrying(scan)) {
    return PRODUCT_SCAN_GOOGLE_STEALTH_RETRY_MESSAGE;
  }

  const { status } = scan;
  if (status === 'queued') return 'Amazon candidate search queued.';
  if (status === 'running') return 'Amazon candidate search running.';
  return null;
}

export function normalizeComparableAsin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized !== '' ? normalized : null;
}

export function normalizeComparableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized !== '' ? normalized : null;
}

export function normalizeMetadataLabel(value: string | null | undefined): string | null {
  const normalized = normalizeComparableText(value);
  if (normalized === null) return null;
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

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

export function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const WEIGHT_UNIT_FACTORS: Record<string, number> = {
  kg: 1, kilogram: 1,
  g: 0.001, gram: 0.001,
  oz: 0.0283495, ounce: 0.0283495,
  lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237,
};

function resolveWeightFactor(unitRaw: string): number | null {
  const unit = Object.keys(WEIGHT_UNIT_FACTORS).find((u) => unitRaw.startsWith(u));
  return unit !== undefined ? (WEIGHT_UNIT_FACTORS[unit] ?? null) : null;
}

export function parseAmazonWeightKg(value: string | null | undefined): number | null {
  const raw = normalizeComparableText(value);
  if (raw === null) return null;
  const match = raw.toLowerCase().match(/([\d.,]+)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?|ounces?|oz)\b/i);
  if (match === null) return null;

  const amount = Number.parseFloat((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const factor = resolveWeightFactor((match[2] ?? '').toLowerCase());
  return factor !== null ? roundToDecimals(amount * factor, 2) : null;
}

function resolveDimensionFactor(unit: string): number {
  if (unit.startsWith('cm') || unit.startsWith('centimeter')) return 1;
  if (unit.startsWith('mm') || unit.startsWith('millimeter')) return 0.1;
  return 2.54;
}

export function parseAmazonDimensionsCm(
  value: string | null | undefined
): { sizeLength: number; sizeWidth: number; length: number } | null {
  const raw = normalizeComparableText(value);
  if (raw === null) return null;
  const match = raw.toLowerCase().match(/([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*(cm|centimeters?|mm|millimeters?|in|inch|inches)\b/i);
  if (match === null) return null;

  const vals = [match[1], match[2], match[3]].map((v) => Number.parseFloat((v ?? '').replace(/,/g, '')));
  if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null;

  const factor = resolveDimensionFactor((match[4] ?? '').toLowerCase());
  const sizeL = vals[0] ?? 0;
  const sizeW = vals[1] ?? 0;
  const len = vals[2] ?? 0;

  return { sizeLength: roundToDecimals(sizeL * factor, 1), sizeWidth: roundToDecimals(sizeW * factor, 1), length: roundToDecimals(len * factor, 1) };
}

function buildAmazonDetailsBaseFields(details: NonNullable<ProductScanRecord['amazonDetails']>): AmazonScanMappedField[] {
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
}

export function buildAmazonMappedFields(
  scan: Pick<ProductScanRecord, 'amazonDetails'>
): AmazonScanMappedField[] {
  const details = scan.amazonDetails;
  if (details === null) return [];

  const base = buildAmazonDetailsBaseFields(details);
  const seen = new Set(base.map((e) => normalizeMetadataLabel(e.sourceLabel)).filter((l): l is string => l !== null));

  const raw = details.attributes.map((e) => ({ sourceLabel: e.label, value: e.value }))
    .filter((e): e is AmazonScanMappedField => {
      const label = normalizeMetadataLabel(e.sourceLabel);
      return normalizeComparableText(e.value) !== null && label !== null && !seen.has(label);
    });

  return [...base, ...raw];
}

export function resolveAmazonMappedFieldKey(field: AmazonScanMappedField): string {
  const label = normalizeMetadataLabel(field.sourceLabel) ?? field.sourceLabel.trim().toLowerCase();
  const val = normalizeComparableText(field.value) ?? '';
  return `${label}::${val}`;
}

export function resolveUnmappedAmazonFields(
  scan: Pick<ProductScanRecord, 'amazonDetails'>,
  mappings: ScanAttributeMapping[]
): AmazonScanMappedField[] {
  const source = buildAmazonMappedFields(scan);
  if (source.length === 0) return [];

  const mapped = new Set(mappings.map((m) => resolveAmazonMappedFieldKey({ sourceLabel: m.sourceLabel, value: m.value })));
  return source.filter((e) => !mapped.has(resolveAmazonMappedFieldKey(e)));
}

export function splitMultiValueTokens(value: string): string[] {
  const parts = value.split(/\s*(?:,|;|\||\/|\band\b)\s*/i);
  return Array.from(new Set(parts.map((e) => normalizeMetadataLabel(e)).filter((e): e is string => e !== null)));
}

export function resolveCheckboxSetOptionMatch(
  field: ProductCustomFieldDefinition,
  sourceValue: string
): { optionIds: string[]; optionLabels: string[] } | null {
  const map = new Map(field.options.map((o) => {
    const label = normalizeMetadataLabel(o.label);
    return label !== null ? [label, { id: o.id, label: o.label }] as const : null;
  }).filter((entry): entry is readonly [string, { id: string; label: string }] => entry !== null));

  const exact = normalizeMetadataLabel(sourceValue);
  const exactOpt = exact !== null ? map.get(exact) : undefined;
  if (exactOpt !== undefined) return { optionIds: [exactOpt.id], optionLabels: [exactOpt.label] };

  const tokens = splitMultiValueTokens(sourceValue);
  if (tokens.length < 2) return null;

  const matched = tokens.map((t) => map.get(t)).filter((o): o is { id: string; label: string } => o !== undefined);
  return matched.length === tokens.length ? { optionIds: matched.map((o) => o.id), optionLabels: matched.map((o) => o.label) } : null;
}

export function haveSameSelectedOptions(
  left: readonly string[] | null | undefined,
  right: readonly string[] | null | undefined
): boolean {
  const leftSet = new Set(Array.isArray(left) ? left : []);
  const rightSet = new Set(Array.isArray(right) ? right : []);
  return leftSet.size === rightSet.size && [...leftSet].every((v) => rightSet.has(v));
}

export function formatCustomFieldSelectedOptionLabels(
  field: ProductCustomFieldDefinition,
  optionIds: readonly string[] | null | undefined
): string | null {
  if (field.type !== 'checkbox_set' || !Array.isArray(optionIds) || optionIds.length === 0) return null;

  const labelMap = new Map<string, string>(field.options.map((o) => [o.id, o.label]));
  const labels = optionIds.filter((id): id is string => typeof id === 'string')
    .map((id) => labelMap.get(id))
    .filter((l): l is string => l !== undefined && normalizeComparableText(l) !== null);

  return labels.length > 0 ? labels.join(', ') : null;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function renderScanMeta(scan: ProductScanRecord): React.JSX.Element | null {
  const asinPart = typeof scan.asin === 'string' && scan.asin !== '' ? `ASIN ${scan.asin}` : null;
  const pricePart = typeof scan.price === 'string' && scan.price !== '' ? `Price ${scan.price}` : null;
  const parts = [asinPart, pricePart].filter((p): p is string => p !== null);
  return parts.length > 0 ? <p className='text-xs text-muted-foreground'>{parts.join(' · ')}</p> : null;
}

function resolveCompletedMessages(asin: string | null): { infoMessage: string | null; errorMessage: string | null } {
  return { infoMessage: asin, errorMessage: null };
}

function resolveNoMatchMessages(asin: string | null, error: string | null): { infoMessage: string | null; errorMessage: string | null } {
  return { infoMessage: asin ?? error, errorMessage: null };
}

function resolveFailureMessages(asin: string | null, error: string | null): { infoMessage: string | null; errorMessage: string | null } {
  return { infoMessage: null, errorMessage: error ?? asin };
}

function resolveActiveMessages(
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } {
  return {
    infoMessage: scan.asinUpdateMessage ?? resolveActiveStatusMessage(scan),
    errorMessage: scan.error ?? null,
  };
}

function resolveMessagesByStatus(
  status: ProductScanStatus,
  asin: string | null,
  error: string | null,
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } {
  if (status === 'completed') return resolveCompletedMessages(asin);
  if (status === 'no_match') return resolveNoMatchMessages(asin, error);
  if (status === 'conflict' || status === 'failed') return resolveFailureMessages(asin, error);
  if (isProductScanActiveStatus(status)) return resolveActiveMessages(scan);
  return { infoMessage: asin, errorMessage: error };
}

export function resolveScanMessages(
  scan: ProductScanRecord
): { infoMessage: string | null; errorMessage: string | null } {
  if (isProductScanCandidateSelectionRequired(scan)) {
    return {
      infoMessage: PRODUCT_SCAN_CANDIDATE_SELECTION_MESSAGE,
      errorMessage: null,
    };
  }

  return resolveMessagesByStatus(
    scan.status,
    scan.asinUpdateMessage ?? null,
    scan.error ?? null,
    scan
  );
}
