import 'server-only';

import { randomUUID } from 'crypto';

import {
  normalizeProductScanRecord,
  type ProductScanRecord,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';

import {
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
} from './product-scanner-settings';

import { readOptionalString } from './product-scans-service.helpers.base';
import { buildPreparedProductScanSteps } from './product-scans-service.helpers.steps';
import {
  formatEvaluationConfidence,
} from './product-scans-service.helpers.amazon';

export { build1688ScanRequestInput } from './product-scans-service.helpers.1688-request';

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
  if (evaluation === null || evaluation === undefined) {
    return '1688 supplier AI evaluation failed.';
  }
  const confidenceLabel = formatEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return format1688EvaluationDecisionMessage(
      'AI evaluator approved the 1688 supplier candidate',
      confidenceLabel
    );
  }
  if (evaluation.status === 'rejected') {
    return format1688EvaluationDecisionMessage(
      'AI evaluator rejected the 1688 supplier candidate',
      confidenceLabel
    );
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped 1688 supplier AI evaluation because the heuristic supplier match was already strong.'
    );
  }
  return evaluation.error ?? '1688 supplier AI evaluation failed.';
};

const format1688EvaluationDecisionMessage = (
  message: string,
  confidenceLabel: string | null
): string =>
  confidenceLabel !== null ? `${message} (${confidenceLabel}).` : `${message}.`;

const read1688EvaluationBoolean = (
  evaluation: ProductScanSupplierEvaluation | null | undefined,
  key: 'sameProduct' | 'imageMatch' | 'titleMatch' | 'proceed'
): string | null => {
  if (evaluation === null || evaluation === undefined) return null;
  const value = evaluation[key];
  return typeof value === 'boolean' ? String(value) : null;
};

const read1688EvaluationModelId = (
  evaluation: ProductScanSupplierEvaluation | null | undefined
): string | null => (evaluation === null || evaluation === undefined ? null : evaluation.modelId);

const read1688EvaluationConfidence = (
  evaluation: ProductScanSupplierEvaluation | null | undefined
): string | null =>
  formatEvaluationConfidence(
    evaluation === null || evaluation === undefined ? null : evaluation.confidence
  );

const read1688EvaluationFirstItem = (
  evaluation: ProductScanSupplierEvaluation | null | undefined,
  key: 'reasons' | 'mismatches'
): string | null => {
  if (evaluation === null || evaluation === undefined) return null;
  return evaluation[key][0] ?? null;
};

const normalize1688ScanActorUserId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const nullableValue = <TValue>(value: TValue | null | undefined): TValue | null => value ?? null;

const resolve1688AsinUpdateStatus = (
  status: ProductScanRecord['status']
): ProductScanRecord['asinUpdateStatus'] => (status === 'failed' ? 'not_needed' : 'pending');

const resolve1688CompletedAt = (status: ProductScanRecord['status']): string | null =>
  status === 'failed' ? new Date().toISOString() : null;

export const build1688EvaluationStepDetails = (
  evaluation: ProductScanSupplierEvaluation | null | undefined,
  evaluatorConfig: ProductScanner1688CandidateEvaluatorResolvedConfig
): Array<{ label: string; value: string | null }> => [
  { label: 'Model', value: read1688EvaluationModelId(evaluation) },
  {
    label: 'Model source',
    value: resolve1688EvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous 1688 candidates only'
      : 'Every 1688 candidate',
  },
  {
    label: 'Confidence',
    value: read1688EvaluationConfidence(evaluation),
  },
  {
    label: 'Same product',
    value: read1688EvaluationBoolean(evaluation, 'sameProduct'),
  },
  {
    label: 'Image match',
    value: read1688EvaluationBoolean(evaluation, 'imageMatch'),
  },
  {
    label: 'Title match',
    value: read1688EvaluationBoolean(evaluation, 'titleMatch'),
  },
  {
    label: 'Proceed',
    value: read1688EvaluationBoolean(evaluation, 'proceed'),
  },
  {
    label: 'Reason',
    value: read1688EvaluationFirstItem(evaluation, 'reasons'),
  },
  {
    label: 'Mismatch',
    value: read1688EvaluationFirstItem(evaluation, 'mismatches'),
  },
];

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
      error: nullableValue(input.error),
    }),
    rawResult: null,
    error: nullableValue(input.error),
    asinUpdateStatus: resolve1688AsinUpdateStatus(input.status),
    asinUpdateMessage: null,
    createdBy: normalize1688ScanActorUserId(input.userId),
    updatedBy: normalize1688ScanActorUserId(input.userId),
    completedAt: resolve1688CompletedAt(input.status),
  });
