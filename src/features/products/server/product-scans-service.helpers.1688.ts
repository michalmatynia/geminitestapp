import 'server-only';

import {
  type ProductScanRecord,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';

import {
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
} from './product-scanner-settings';

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
