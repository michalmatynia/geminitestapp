import 'server-only';

import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  readOptionalString,
  toRecord,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import { resolveAmazonRuntimeActionDefinition } from './product-scans-service.helpers.amazon';

export type AmazonScanRuntimeKey =
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;

const AMAZON_PRODUCT_SCAN_RUNTIME_KEYS = new Set<string>([
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
]);

export const resolveAmazonScanRuntimeKey = (scan: ProductScanRecord): AmazonScanRuntimeKey => {
  const rawRuntimeKey = readOptionalString(toRecord(scan.rawResult)?.['runtimeKey'], 160);
  if (rawRuntimeKey !== null && AMAZON_PRODUCT_SCAN_RUNTIME_KEYS.has(rawRuntimeKey)) {
    return rawRuntimeKey as AmazonScanRuntimeKey;
  }
  return AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;
};

export const resolveAmazonScanRuntimeAction = (
  scan: ProductScanRecord
): Promise<PlaywrightAction | null> =>
  resolveAmazonRuntimeActionDefinition(resolveAmazonScanRuntimeKey(scan));

const resolveLatestGoogleCandidatesStep = (
  steps: AmazonScanRuntimeResult['steps']
): AmazonScanRuntimeResult['steps'][number] | null => {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step?.key === 'google_candidates') {
      return step;
    }
  }

  return null;
};

export const isGoogleCandidatesNoCandidatesFailure = (
  parsedResult: AmazonScanRuntimeResult
): boolean => {
  const latestGoogleCandidatesStep = resolveLatestGoogleCandidatesStep(parsedResult.steps);
  if (
    latestGoogleCandidatesStep?.status === 'failed' &&
    latestGoogleCandidatesStep.resultCode === 'no_candidates'
  ) {
    return true;
  }

  if (parsedResult.stage !== 'google_candidates') {
    return false;
  }

  const normalizedMessage = readOptionalString(parsedResult.message)?.toLowerCase() ?? '';
  return (
    normalizedMessage.includes('no amazon candidates found') ||
    normalizedMessage.includes('did not contain any amazon product urls')
  );
};

export const resolveScanOwnerUserId = (scan: ProductScanRecord): string | null => {
  const ownerUserId = scan.updatedBy?.trim() ?? '';
  return ownerUserId.length > 0 ? ownerUserId : null;
};
