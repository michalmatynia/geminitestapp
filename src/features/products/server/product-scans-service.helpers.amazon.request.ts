import 'server-only';

import { randomUUID } from 'crypto';

import {
  normalizeProductScanRecord,
  type ProductScanRecord,
  type ProductScanRequestSequenceEntry,
} from '@/shared/contracts/product-scans';
import type {
  ProductScannerAmazonImageSearchProvider,
} from '@/shared/contracts/products/scanner-settings';

import {
  PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH,
  PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH,
  PRODUCT_SCAN_URL_MAX_LENGTH,
} from './product-scans-service.constants';
import {
  normalizeProductScanRequestSequence,
  readOptionalString,
} from './product-scans-service.helpers.base';
import {
  buildPreparedProductScanSteps,
  normalizeParsedCandidateUrls,
} from './product-scans-service.helpers.steps';
import { normalizeAmazonImageSearchPageUrl } from './product-scans-service.helpers.amazon.image-search';

type BuildAmazonScanRequestInput = {
  productId: string;
  productName: string | null;
  existingAsin: string | null | undefined;
  imageCandidates: ProductScanRecord['imageCandidates'];
  runtimeKey?: string | null;
  imageSearchProvider?: ProductScannerAmazonImageSearchProvider | null;
  imageSearchPageUrl?: string | null;
  selectorProfile?: string | null;
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  triageOnlyOnAmazonCandidates?: boolean;
  collectAmazonCandidatePreviews?: boolean;
  probeOnlyOnAmazonMatch?: boolean;
  skipAmazonProbe?: boolean;
  directAmazonCandidateUrl?: string | null;
  directAmazonCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directAmazonCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
};

const resolveAmazonRequestImageSearchProvider = (
  value: ProductScannerAmazonImageSearchProvider | null | undefined
): ProductScannerAmazonImageSearchProvider =>
  value === 'google_images_url' || value === 'google_lens_upload'
    ? value
    : 'google_images_upload';

const resolvePositiveInteger = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
};

const resolveBatchIndex = (value: number | null | undefined): number =>
  resolvePositiveInteger(value) ?? 0;

export const buildAmazonScanRequestInput = (
  input: BuildAmazonScanRequestInput
): Record<string, unknown> => ({
  allowManualVerification: input.allowManualVerification,
  batchIndex: resolveBatchIndex(input.batchIndex),
  collectAmazonCandidatePreviews: input.collectAmazonCandidatePreviews === true,
  directAmazonCandidateRank: resolvePositiveInteger(input.directAmazonCandidateRank),
  directAmazonCandidateUrl: readOptionalString(input.directAmazonCandidateUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  directAmazonCandidateUrls: normalizeParsedCandidateUrls(input.directAmazonCandidateUrls),
  directMatchedImageId: readOptionalString(input.directMatchedImageId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  existingAsin: input.existingAsin ?? null,
  imageCandidates: input.imageCandidates,
  imageSearchPageUrl: normalizeAmazonImageSearchPageUrl(input.imageSearchPageUrl),
  imageSearchProvider: resolveAmazonRequestImageSearchProvider(input.imageSearchProvider),
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  probeOnlyOnAmazonMatch: input.probeOnlyOnAmazonMatch === true,
  productId: input.productId,
  productName: input.productName,
  runtimeKey: readOptionalString(input.runtimeKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  selectorProfile: readOptionalString(input.selectorProfile, 120) ?? 'amazon',
  skipAmazonProbe: input.skipAmazonProbe === true,
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  triageOnlyOnAmazonCandidates: input.triageOnlyOnAmazonCandidates === true,
});

const resolveProductScanUserId = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized !== '' ? normalized : null;
};

export const createAmazonProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord => {
  const userId = resolveProductScanUserId(input.userId);
  return normalizeProductScanRecord({
    amazonDetails: null,
    amazonEvaluation: null,
    amazonProbe: null,
    asin: null,
    asinUpdateMessage: null,
    asinUpdateStatus: 'not_needed',
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
    connectionId: readOptionalString(input.connectionId, 160),
    createdBy: userId,
    description: null,
    engineRunId: null,
    error: input.error ?? null,
    id: randomUUID(),
    imageCandidates: input.imageCandidates,
    integrationId: readOptionalString(input.integrationId, 160),
    matchedImageId: null,
    price: null,
    productId: input.productId,
    productName: input.productName,
    provider: 'amazon',
    rawResult: null,
    scanType: 'google_reverse_image',
    status: input.status,
    steps: buildPreparedProductScanSteps({
      error: input.error ?? null,
      imageCandidateCount: input.imageCandidates.length,
      prepareLabel: 'Amazon',
      status: input.status,
      summaryLabel: 'Amazon candidate search',
    }),
    title: null,
    updatedBy: userId,
    url: null,
  });
};
