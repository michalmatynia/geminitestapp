import type {
  ProductScanAmazonEvaluationResult,
  ProductScanStep,
} from '@/shared/contracts/product-scans';
import type { DetailField } from './ProductScanAmazonDetails.types';

export const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const normalizeText = (value: string | null | undefined): string | null =>
  hasText(value) ? value.trim() : null;

export const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const resolveDetailFields = (
  fields: DetailField[]
): Array<{ label: string; value: string }> =>
  fields
    .map((field) => {
      const value = normalizeText(field.value);
      return value === null ? null : { label: field.label, value };
    })
    .filter((field): field is { label: string; value: string } => field !== null);

export const formatResultCode = (value: string | null | undefined): string | null => {
  const normalized = normalizeText(value);
  if (normalized === null) return null;
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const resolveInputSourceLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeText(value);
  if (normalized === null) return null;
  if (normalized === 'url') return 'URL input';
  if (normalized === 'file') return 'File input';
  return normalized;
};

export const resolveAmazonEvaluationStatusLabel = (
  value: ProductScanAmazonEvaluationResult['status'] | null | undefined
): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  if (value === 'approved') return 'AI approved';
  if (value === 'rejected') return 'AI rejected';
  if (value === 'skipped') return 'AI skipped';
  return 'AI failed';
};

export const formatEvaluationConfidence = (
  value: number | null | undefined
): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;

const LANGUAGE_LABELS: Record<string, string> = {
  de: 'German',
  en: 'English',
  'en-gb': 'English (UK)',
  'en-us': 'English (US)',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ja: 'Japanese',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
};

export const formatAmazonPageLanguage = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeText(value)?.toLowerCase() ?? null;
  if (normalized === null) return null;
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
};

export const resolveStepDetailValue = (
  step: Pick<ProductScanStep, 'details'>,
  label: string
): string | null => {
  const details = Array.isArray(step.details) ? step.details : [];
  const detail = details.find((entry) => entry.label === label);
  return normalizeText(detail?.value);
};

export const formatBooleanValue = (value: boolean | null | undefined): string | null =>
  typeof value === 'boolean' ? String(value) : null;
