import type { ProductScanStep, ProductScanStepGroup } from '@/shared/contracts/product-scans';
import {
  PRODUCT_SCAN_STEP_GROUP_LABELS as STEP_GROUP_LABELS,
  PRODUCT_SCAN_STEP_GROUP_ORDER as STEP_GROUP_ORDER,
} from '@/features/playwright/scan-steps';

const DIRECT_STEP_GROUP_BY_KEY = new Map<string, ProductScanStepGroup>([
  ['init_scan', 'input'],
  ['queue_scan', 'input'],
  ['google_upload', 'google_lens'],
  ['google_candidates', 'google_lens'],
  ['google_captcha', 'google_lens'],
]);

const STEP_GROUP_PREFIXES: Array<{ prefix: string; group: ProductScanStepGroup }> = [
  { prefix: 'amazon_', group: 'amazon' },
  { prefix: '1688_', group: 'supplier' },
  { prefix: 'supplier_', group: 'supplier' },
];

export const STEP_STATUS_LABELS: Record<ProductScanStep['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const STEP_STATUS_CLASSES: Record<ProductScanStep['status'], string> = {
  pending: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  failed: 'border-destructive/40 text-destructive',
  skipped: 'border-amber-500/40 text-amber-300',
};

export const resolveStepGroup = (
  step: Pick<ProductScanStep, 'group' | 'key'>
): ProductScanStepGroup => {
  if (step.group !== null) return step.group;
  const directGroup = DIRECT_STEP_GROUP_BY_KEY.get(step.key);
  if (directGroup !== undefined) return directGroup;
  return STEP_GROUP_PREFIXES.find(({ prefix }) => step.key.startsWith(prefix))?.group ?? 'product';
};

export const getStepGroupLabel = (group: ProductScanStepGroup): string => {
  const label = (STEP_GROUP_LABELS as Record<string, string>)[group];
  return typeof label === 'string' ? label : 'Scan';
};

export const getStepGroupOrder = (group: ProductScanStepGroup): number => {
  const order = (STEP_GROUP_ORDER as Record<string, number>)[group];
  return typeof order === 'number' ? order : 999;
};

export const resolveStepDetailValue = (
  step: Pick<ProductScanStep, 'details'>,
  label: string
): string | null => {
  const detail = step.details.find((entry) => entry.label === label);
  const value = detail?.value;
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return null;
};

export const resolveNonEmptyString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const formatResultCode = (value: string | null | undefined): string | null => {
  const normalized = resolveNonEmptyString(value);
  if (normalized === null) return null;
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDuration = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  if (value < 1000) return `${value} ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainderSeconds}s`;
};

const buildTimingSegments = (step: ProductScanStep): string[] => {
  const startedAt = resolveNonEmptyString(step.startedAt);
  const completedAt = resolveNonEmptyString(step.completedAt);
  const duration = formatDuration(step.durationMs);
  return [
    startedAt !== null ? `Started ${formatTimestamp(startedAt)}` : null,
    completedAt !== null ? `Completed ${formatTimestamp(completedAt)}` : null,
    duration !== null ? `Duration ${duration}` : null,
  ].filter((segment): segment is string => segment !== null);
};

export const formatStepTiming = (step: ProductScanStep): string | null => {
  const segments = buildTimingSegments(step);
  return segments.length > 0 ? segments.join(' · ') : null;
};

export const resolveStepAttempt = (step: Pick<ProductScanStep, 'attempt'>): number | null => {
  if (typeof step.attempt === 'number' && Number.isFinite(step.attempt)) return step.attempt;
  return null;
};

export const resolveStepUrl = (step: Pick<ProductScanStep, 'url'>): string | null =>
  resolveNonEmptyString(step.url);
