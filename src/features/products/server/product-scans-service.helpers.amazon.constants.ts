import 'server-only';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import type {
  ProductScanAmazonEvaluation,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type {
  ProductScannerAmazonImageSearchProvider,
} from '@/shared/contracts/products/scanner-settings';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import {
  getPlaywrightRuntimeActionSeed,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  resolveRuntimeActionDefinition,
} from '@/shared/lib/browser-execution/runtime-action-resolver.server';

import { AMAZON_SCAN_TIMEOUT_MS } from './product-scans-service.constants';
import { readOptionalString, toRecord } from './product-scans-service.helpers.base';

export const AMAZON_SCAN_DEFAULT_SLOW_MO_MS = 80;
export const PRODUCT_SCAN_BATCH_START_CONCURRENCY = 1;
export const AMAZON_BATCH_SCAN_START_CONCURRENCY = PRODUCT_SCAN_BATCH_START_CONCURRENCY;
export const AMAZON_SCAN_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const AMAZON_SCAN_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];
export const AMAZON_SCAN_MANUAL_VERIFICATION_BUFFER_MS = 60_000;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MIN_MS = 90;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MAX_MS = 280;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MIN_MS = 70;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MAX_MS = 210;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MIN_MS = 650;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MAX_MS = 1900;

export const AMAZON_IMAGE_SEARCH_PROVIDER_FALLBACK_ORDER = [
  'google_images_upload',
  'google_images_url',
  'google_lens_upload',
] as const satisfies ReadonlyArray<ProductScannerAmazonImageSearchProvider>;

export type AmazonProductScanRuntimeKey =
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;

const AMAZON_PRODUCT_SCAN_RUNTIME_KEYS = new Set<string>([
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
]);

export const resolveAmazonProductScanRuntimeKey = (
  value: unknown,
  fallback: AmazonProductScanRuntimeKey = AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
): AmazonProductScanRuntimeKey => {
  const normalized = readOptionalString(value);
  if (normalized !== null && AMAZON_PRODUCT_SCAN_RUNTIME_KEYS.has(normalized)) {
    return normalized as AmazonProductScanRuntimeKey;
  }
  return fallback;
};

export const resolveAmazonRuntimeActionDefinition = async (
  runtimeKey: AmazonProductScanRuntimeKey | null | undefined
): Promise<PlaywrightAction | null> => {
  if (runtimeKey === null || runtimeKey === undefined) return null;
  try {
    return await resolveRuntimeActionDefinition(runtimeKey);
  } catch {
    return getPlaywrightRuntimeActionSeed(runtimeKey);
  }
};

export const isApprovedAmazonCandidateExtractionRun = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'amazonEvaluation'>
): boolean =>
  toRecord(scan.rawResult)?.['approvedCandidateExtraction'] === true &&
  (scan.amazonEvaluation?.status === 'approved' || scan.amazonEvaluation?.status === 'skipped');

export const mergeUniqueStringValues = (
  values: ReadonlyArray<string>,
  nextValues: ReadonlyArray<string>
): string[] => {
  const merged = new Set(values.filter((value) => value.trim().length > 0));
  for (const value of nextValues) {
    const normalized = value.trim();
    if (normalized.length > 0) merged.add(normalized);
  }
  return Array.from(merged);
};

export const hasFiniteNumberSetting = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isGoogleFacingAmazonRuntimeKey = (
  runtimeKey: string | null | undefined
): runtimeKey is
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY =>
  runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY ||
  runtimeKey === AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;

export const resolveAmazonScanRuntimeTimeoutMs = (input: {
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
}): number => {
  if (!input.allowManualVerification) return AMAZON_SCAN_TIMEOUT_MS;
  return Math.max(
    AMAZON_SCAN_TIMEOUT_MS,
    input.manualVerificationTimeoutMs + AMAZON_SCAN_MANUAL_VERIFICATION_BUFFER_MS
  );
};

export const formatEvaluationConfidence = (confidence: number | null | undefined): string | null =>
  typeof confidence === 'number' && Number.isFinite(confidence)
    ? `${Math.round(confidence * 100)}%`
    : null;

export const shouldWriteAmazonEnglishContent = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): boolean => evaluation?.languageAccepted !== false && evaluation?.scrapeAllowed !== false;
