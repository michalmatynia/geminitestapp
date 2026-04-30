import 'server-only';

import type {
  ProductScanRecord,
  ProductScanRequestSequenceEntry,
} from '@/shared/contracts/product-scans';
import type { Supplier1688SelectorRegistryResolutionSummary } from '@/features/integrations/services/supplier-1688-selector-registry';
import type { Supplier1688SelectorRuntime } from '@/shared/lib/browser-execution/selectors/supplier-1688';

import {
  PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH,
  PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH,
  PRODUCT_SCAN_URL_MAX_LENGTH,
} from './product-scans-service.constants';
import {
  normalizeProductScanRequestSequence,
  readOptionalString,
} from './product-scans-service.helpers.base';
import { normalizeParsedCandidateUrls } from './product-scans-service.helpers.steps';

export type Build1688ScanRequestInput = {
  productId: string;
  productName: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  integrationId?: string | null;
  connectionId?: string | null;
  scanner1688StartUrl?: string | null;
  scanner1688LoginMode?: 'session_required' | 'manual_login' | null;
  scanner1688DefaultSearchMode?: 'local_image' | 'image_url_fallback' | null;
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  candidateResultLimit?: number | null;
  minimumCandidateScore?: number | null;
  maxExtractedImages?: number | null;
  allowUrlImageSearchFallback?: boolean | null;
  directSupplierCandidateUrl?: string | null;
  directSupplierCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directSupplierCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
  runtimeKey?: string | null;
  actionId?: string | null;
  actionName?: string | null;
  action?: unknown;
  blocks?: unknown[] | null;
  selectorProfile?: string | null;
  selectorRegistryResolution?: Supplier1688SelectorRegistryResolutionSummary | null;
  selectorRuntime?: Supplier1688SelectorRuntime | null;
  evaluatorConfig?: unknown;
};

const positiveIntegerOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const positiveIntegerOrZero = (value: number | null | undefined): number =>
  positiveIntegerOrNull(value) ?? 0;

const resolve1688LoginMode = (
  value: Build1688ScanRequestInput['scanner1688LoginMode']
): 'session_required' | 'manual_login' =>
  value === 'manual_login' ? 'manual_login' : 'session_required';

const resolve1688DefaultSearchMode = (
  value: Build1688ScanRequestInput['scanner1688DefaultSearchMode']
): 'local_image' | 'image_url_fallback' =>
  value === 'image_url_fallback' ? 'image_url_fallback' : 'local_image';

const nullableValue = <TValue>(value: TValue | null | undefined): TValue | null => value ?? null;

const resolveBlocks = (blocks: unknown[] | null | undefined): unknown[] =>
  Array.isArray(blocks) ? blocks : [];

export const build1688ScanRequestInput = (
  input: Build1688ScanRequestInput
): Record<string, unknown> => ({
  productId: input.productId,
  productName: input.productName,
  imageCandidates: input.imageCandidates,
  integrationId: readOptionalString(input.integrationId, 160),
  connectionId: readOptionalString(input.connectionId, 160),
  scanner1688StartUrl: readOptionalString(input.scanner1688StartUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  scanner1688LoginMode: resolve1688LoginMode(input.scanner1688LoginMode),
  scanner1688DefaultSearchMode: resolve1688DefaultSearchMode(input.scanner1688DefaultSearchMode),
  batchIndex: positiveIntegerOrZero(input.batchIndex),
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  candidateResultLimit: positiveIntegerOrNull(input.candidateResultLimit),
  minimumCandidateScore: positiveIntegerOrNull(input.minimumCandidateScore),
  maxExtractedImages: positiveIntegerOrNull(input.maxExtractedImages),
  allowUrlImageSearchFallback: input.allowUrlImageSearchFallback !== false,
  directSupplierCandidateUrl: readOptionalString(
    input.directSupplierCandidateUrl,
    PRODUCT_SCAN_URL_MAX_LENGTH
  ),
  directSupplierCandidateUrls: normalizeParsedCandidateUrls(input.directSupplierCandidateUrls),
  directMatchedImageId: readOptionalString(
    input.directMatchedImageId,
    PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH
  ),
  directSupplierCandidateRank: positiveIntegerOrNull(input.directSupplierCandidateRank),
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
  runtimeKey: readOptionalString(input.runtimeKey, 160),
  actionId: readOptionalString(input.actionId, 160),
  actionName: readOptionalString(input.actionName, 240),
  action: nullableValue(input.action),
  blocks: resolveBlocks(input.blocks),
  selectorProfile: readOptionalString(input.selectorProfile, 120),
  selectorRegistryResolution: nullableValue(input.selectorRegistryResolution),
  selectorRuntime: nullableValue(input.selectorRuntime),
  evaluatorConfig: nullableValue(input.evaluatorConfig),
});
