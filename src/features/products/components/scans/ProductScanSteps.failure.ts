import type { ProductScanStep } from '@/shared/contracts/product-scans';

import { resolveStepGroup } from './ProductScanSteps.utils';

const GOOGLE_FAILURE_SOURCE_BY_KEY = new Map<string, string>([
  ['google_upload', 'Google entry'],
  ['google_candidates', 'Candidate collection'],
]);

const AMAZON_FAILURE_SOURCE_BY_KEY = new Map<string, string>([
  ['amazon_ai_triage', 'Amazon triage'],
  ['amazon_ai_evaluate', 'Amazon evaluator'],
  ['amazon_extract', 'Amazon extraction'],
]);

const AMAZON_PAGE_KEYS = new Set(['amazon_open', 'amazon_overlays', 'amazon_content_ready']);

const SUPPLIER_SEARCH_KEYS = new Set([
  '1688_open',
  '1688_upload',
  '1688_collect_candidates',
]);

const SUPPLIER_PAGE_KEYS = new Set([
  'supplier_open',
  'supplier_content_ready',
  'supplier_overlays',
]);

const resolveAmazonFailureSourceLabel = (key: string): string => {
  const label = AMAZON_FAILURE_SOURCE_BY_KEY.get(key);
  if (label !== undefined) return label;
  return AMAZON_PAGE_KEYS.has(key) ? 'Amazon page' : 'Amazon page';
};

const resolveSupplierFailureSourceLabel = (key: string): string => {
  if (SUPPLIER_SEARCH_KEYS.has(key)) return 'Supplier search';
  if (key === 'supplier_ai_evaluate') return 'Supplier evaluator';
  if (SUPPLIER_PAGE_KEYS.has(key)) return 'Supplier page';
  if (key === 'supplier_extract') return 'Supplier extraction';
  return 'Supplier page';
};

export const resolveProductScanFailureSourceLabel = (
  step: Pick<ProductScanStep, 'group' | 'key'>
): string | null => {
  const group = resolveStepGroup(step);
  if (group === 'input') return 'Input setup';
  if (group === 'google_lens') return GOOGLE_FAILURE_SOURCE_BY_KEY.get(step.key) ?? 'Google results';
  if (group === 'amazon') return resolveAmazonFailureSourceLabel(step.key);
  if (group === 'supplier') return resolveSupplierFailureSourceLabel(step.key);
  return 'Product update';
};
