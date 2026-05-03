import {
  resolveAmazonScanQualitySummary,
  resolveRejectedAmazonCandidateBreakdown,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

export const hasDisplayText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const formatRejectedCandidateLabel = (count: number): string =>
  `${count} rejected candidate${count === 1 ? '' : 's'}`;

export const formatAmazonScanTimestamp = (value: string | null | undefined): string => {
  if (hasDisplayText(value) === false) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const resolveScanSelectionLabel = (scan: ProductScanRecord): string => {
  const statusLabel = scan.status.replace(/_/g, ' ');
  const asin = typeof scan.asin === 'string' ? scan.asin.trim() : '';
  const asinLabel = asin.length > 0 ? `ASIN ${asin}` : 'No ASIN';
  return `${formatAmazonScanTimestamp(scan.updatedAt)} · ${statusLabel} · ${asinLabel}`;
};

const resolveRejectedCandidateHintLabels = (
  rejectedCandidateCount: number,
  languageRejectedCount: number
): string[] => {
  if (rejectedCandidateCount <= 0) return [];
  const labels = [formatRejectedCandidateLabel(rejectedCandidateCount)];
  if (languageRejectedCount > 0) labels.push(`${languageRejectedCount} non-English`);
  return labels;
};

export const resolveScanQualityHintLabels = (scan: ProductScanRecord): string[] => {
  const quality = resolveAmazonScanQualitySummary(scan);
  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  const rejectedCandidateLabels = resolveRejectedCandidateHintLabels(
    rejectedCandidateBreakdown.totalCount,
    rejectedCandidateBreakdown.languageRejectedCount
  );

  if (quality === null) return rejectedCandidateLabels;

  return [
    quality.primaryLabel,
    ...(quality.usedFallback ? ['Fallback used'] : []),
    ...(quality.usedCaptcha ? ['Captcha path'] : []),
    ...rejectedCandidateLabels,
  ];
};
