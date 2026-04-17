import 'server-only';

import { randomUUID } from 'crypto';

import {
  normalizeProductScanRecord,
  type ProductScanRecord,
  type ProductScanRequestSequenceEntry,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';

import {
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
} from './product-scanner-settings';

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
import {
  formatAmazonEvaluationConfidence,
} from './product-scans-service.helpers.amazon';

export const resolveNext1688EvaluationStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'supplier_ai_evaluate')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

export const resolve1688EvaluationStepStatus = (
  evaluation: ProductScanSupplierEvaluation | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (!evaluation) {
    return 'failed';
  }
  if (evaluation.status === 'approved') {
    return 'completed';
  }
  if (evaluation.status === 'skipped') {
    return 'skipped';
  }
  if (evaluation.status === 'rejected') {
    return 'failed';
  }
  return 'failed';
};

export const resolve1688EvaluationStepResultCode = (
  evaluation: ProductScanSupplierEvaluation | null | undefined
): string => {
  if (!evaluation) {
    return 'evaluation_failed';
  }
  if (evaluation.status === 'approved') {
    return 'candidate_approved';
  }
  if (evaluation.status === 'rejected') {
    return 'candidate_rejected';
  }
  if (evaluation.status === 'skipped') {
    return 'evaluation_skipped';
  }
  return 'evaluation_failed';
};

export const resolve1688EvaluatorModelSource = (
  value: ProductScanner1688CandidateEvaluatorResolvedConfig['mode'] | null | undefined
): string | null => {
  if (value === 'brain_default') {
    return 'AI Brain default';
  }

  if (value === 'model_override') {
    return 'Scanner override';
  }

  return null;
};

export const resolve1688CandidateRank = (
  probe: ProductScanRecord['supplierProbe']
): number | null => {
  const candidateRank =
    probe && typeof probe === 'object' && 'candidateRank' in probe
      ? (probe as { candidateRank?: unknown }).candidateRank
      : null;
  if (
    typeof candidateRank === 'number' &&
    Number.isFinite(candidateRank) &&
    candidateRank > 0
  ) {
    return candidateRank;
  }

  return null;
};

export const resolve1688EvaluationMessage = (
  evaluation: ProductScanSupplierEvaluation | null | undefined
): string => {
  if (!evaluation) {
    return '1688 supplier AI evaluation failed.';
  }
  const confidenceLabel = formatAmazonEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return confidenceLabel
      ? `AI evaluator approved the 1688 supplier candidate (${confidenceLabel}).`
      : 'AI evaluator approved the 1688 supplier candidate.';
  }
  if (evaluation.status === 'rejected') {
    return confidenceLabel
      ? `AI evaluator rejected the 1688 supplier candidate (${confidenceLabel}).`
      : 'AI evaluator rejected the 1688 supplier candidate.';
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped 1688 supplier AI evaluation because the heuristic supplier match was already strong.'
    );
  }
  return evaluation.error ?? '1688 supplier AI evaluation failed.';
};

export const build1688EvaluationStepDetails = (
  evaluation: ProductScanSupplierEvaluation | null | undefined,
  evaluatorConfig: ProductScanner1688CandidateEvaluatorResolvedConfig
): Array<{ label: string; value: string | null }> => [
  { label: 'Model', value: evaluation?.modelId ?? null },
  {
    label: 'Model source',
    value: resolve1688EvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatAmazonEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous 1688 candidates only'
      : 'Every 1688 candidate',
  },
  {
    label: 'Confidence',
    value: formatAmazonEvaluationConfidence(evaluation?.confidence),
  },
  {
    label: 'Same product',
    value:
      evaluation && typeof evaluation.sameProduct === 'boolean' ? String(evaluation.sameProduct) : null,
  },
  {
    label: 'Image match',
    value:
      evaluation && typeof evaluation.imageMatch === 'boolean' ? String(evaluation.imageMatch) : null,
  },
  {
    label: 'Title match',
    value:
      evaluation && typeof evaluation.titleMatch === 'boolean' ? String(evaluation.titleMatch) : null,
  },
  {
    label: 'Proceed',
    value: evaluation && typeof evaluation.proceed === 'boolean' ? String(evaluation.proceed) : null,
  },
  {
    label: 'Reason',
    value: evaluation?.reasons[0] ?? null,
  },
  {
    label: 'Mismatch',
    value: evaluation?.mismatches[0] ?? null,
  },
];

export const build1688ScanRequestInput = (input: {
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
  selectorRegistryResolution?: Record<string, unknown> | null;
  selectorRuntime?: unknown;
  evaluatorConfig?: unknown;
}): Record<string, unknown> => ({
  productId: input.productId,
  productName: input.productName,
  imageCandidates: input.imageCandidates,
  integrationId: readOptionalString(input.integrationId, 160),
  connectionId: readOptionalString(input.connectionId, 160),
  scanner1688StartUrl: readOptionalString(input.scanner1688StartUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  scanner1688LoginMode:
    input.scanner1688LoginMode === 'manual_login' ? 'manual_login' : 'session_required',
  scanner1688DefaultSearchMode:
    input.scanner1688DefaultSearchMode === 'image_url_fallback'
      ? 'image_url_fallback'
      : 'local_image',
  batchIndex:
    typeof input.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
      ? Math.trunc(input.batchIndex)
      : 0,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  candidateResultLimit:
    typeof input.candidateResultLimit === 'number' &&
    Number.isFinite(input.candidateResultLimit) &&
    input.candidateResultLimit > 0
      ? Math.trunc(input.candidateResultLimit)
      : null,
  minimumCandidateScore:
    typeof input.minimumCandidateScore === 'number' &&
    Number.isFinite(input.minimumCandidateScore) &&
    input.minimumCandidateScore > 0
      ? Math.trunc(input.minimumCandidateScore)
      : null,
  maxExtractedImages:
    typeof input.maxExtractedImages === 'number' &&
    Number.isFinite(input.maxExtractedImages) &&
    input.maxExtractedImages > 0
      ? Math.trunc(input.maxExtractedImages)
      : null,
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
  directSupplierCandidateRank:
    typeof input.directSupplierCandidateRank === 'number' &&
    Number.isFinite(input.directSupplierCandidateRank) &&
    input.directSupplierCandidateRank > 0
      ? Math.trunc(input.directSupplierCandidateRank)
      : null,
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
  runtimeKey: readOptionalString(input.runtimeKey, 160),
  actionId: readOptionalString(input.actionId, 160),
  actionName: readOptionalString(input.actionName, 240),
  action: input.action ?? null,
  blocks: Array.isArray(input.blocks) ? input.blocks : [],
  selectorProfile: readOptionalString(input.selectorProfile, 120),
  selectorRegistryResolution: input.selectorRegistryResolution ?? null,
  selectorRuntime: input.selectorRuntime ?? null,
  evaluatorConfig: input.evaluatorConfig ?? null,
});

export const create1688ProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    integrationId: readOptionalString(input.integrationId, 160),
    connectionId: readOptionalString(input.connectionId, 160),
    provider: '1688',
    scanType: 'supplier_reverse_image',
    status: input.status,
    productName: input.productName,
    engineRunId: null,
    imageCandidates: input.imageCandidates,
    matchedImageId: null,
    asin: null,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: null,
    amazonEvaluation: null,
    supplierDetails: null,
    supplierProbe: null,
    supplierEvaluation: null,
    steps: buildPreparedProductScanSteps({
      prepareLabel: '1688 supplier',
      summaryLabel: '1688 supplier reverse image',
      imageCandidateCount: input.imageCandidates.length,
      status: input.status,
      error: input.error ?? null,
    }),
    rawResult: null,
    error: input.error ?? null,
    asinUpdateStatus: input.status === 'failed' ? 'not_needed' : 'pending',
    asinUpdateMessage: null,
    createdBy: (input.userId?.trim() ?? '') !== '' ? String(input.userId).trim() : null,
    updatedBy: (input.userId?.trim() ?? '') !== '' ? String(input.userId).trim() : null,
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
  });
