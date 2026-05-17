import { isProductScanCandidateSelectionRequired } from '@/features/products/lib/product-scan-run-feedback';

import type { ScanModalRow } from './ProductScanModal.types';

type ProductScanRowsSummaryCounts = {
  enqueuing: number;
  queued: number;
  running: number;
  awaitingSelection: number;
  completed: number;
  noMatch: number;
  conflict: number;
  failed: number;
};

const createSummaryCounts = (): ProductScanRowsSummaryCounts => ({
  enqueuing: 0,
  queued: 0,
  running: 0,
  awaitingSelection: 0,
  completed: 0,
  noMatch: 0,
  conflict: 0,
  failed: 0,
});

const incrementStatusCount = (
  counts: ProductScanRowsSummaryCounts,
  status: ScanModalRow['status']
): ProductScanRowsSummaryCounts => {
  switch (status) {
    case 'enqueuing':
      return { ...counts, enqueuing: counts.enqueuing + 1 };
    case 'queued':
      return { ...counts, queued: counts.queued + 1 };
    case 'running':
      return { ...counts, running: counts.running + 1 };
    case 'completed':
      return { ...counts, completed: counts.completed + 1 };
    case 'no_match':
      return { ...counts, noMatch: counts.noMatch + 1 };
    case 'conflict':
      return { ...counts, conflict: counts.conflict + 1 };
    case 'failed':
      return { ...counts, failed: counts.failed + 1 };
    default:
      return counts;
  }
};

const countScanRows = (rows: ScanModalRow[]): ProductScanRowsSummaryCounts => {
  let counts = createSummaryCounts();
  for (const row of rows) {
    if (isProductScanCandidateSelectionRequired(row.scan)) {
      counts = { ...counts, awaitingSelection: counts.awaitingSelection + 1 };
      continue;
    }
    counts = incrementStatusCount(counts, row.status);
  }
  return counts;
};

const formatCount = (count: number, label: string): string | null => {
  if (count <= 0) return null;
  return `${count} ${label}`;
};

export const formatProductScanRowsSummary = (rows: ScanModalRow[]): string => {
  if (rows.length === 0) return 'No products selected';
  const counts = countScanRows(rows);

  return [
    `${rows.length} selected`,
    formatCount(counts.enqueuing, 'enqueuing'),
    formatCount(counts.queued, 'queued'),
    formatCount(counts.running, 'running'),
    formatCount(counts.awaitingSelection, 'awaiting selection'),
    formatCount(counts.completed, 'completed'),
    formatCount(counts.noMatch, 'no match'),
    formatCount(counts.conflict, 'conflicts'),
    formatCount(counts.failed, 'failed'),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' · ');
};

export const buildProductScanToastSummaryFromRows = (
  rows: ScanModalRow[],
  batchLabel: string,
  noQueuedMessage: string
): { message: string; variant: 'success' | 'warning' } => {
  const counts = countScanRows(rows);
  const summary = [
    formatCount(counts.queued, 'queued'),
    formatCount(counts.running, 'running'),
    formatCount(counts.awaitingSelection, 'awaiting selection'),
    formatCount(counts.completed, 'completed'),
    formatCount(counts.noMatch, 'no match'),
    formatCount(counts.conflict, 'conflicts'),
    formatCount(counts.failed, 'failed'),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(', ');

  return {
    message: summary !== '' ? `${batchLabel}: ${summary}.` : noQueuedMessage,
    variant: counts.failed > 0 || counts.conflict > 0 ? 'warning' : 'success',
  };
};
