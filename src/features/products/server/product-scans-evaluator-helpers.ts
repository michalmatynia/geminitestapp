import 'server-only';

import {
  type ProductScanAmazonEvaluation,
  type ProductScanRecord,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';
import {
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
} from './product-scanner-settings';
import { toRecord } from './product-scans-service.helpers';

export const formatAmazonEvaluationConfidence = (confidence: number | null | undefined): string | null =>
  typeof confidence === 'number' && Number.isFinite(confidence)
    ? `${Math.round(confidence * 100)}%`
    : null;

export const resolveAmazonEvaluationStepStatus = (
  evaluation: ProductScanAmazonEvaluation
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
  return 'failed';
};

export const resolveAmazonEvaluationStepResultCode = (
  evaluation: ProductScanAmazonEvaluation
): string => {
  if (!evaluation) {
    return 'evaluation_failed';
  }
  if (evaluation.status === 'approved') {
    return 'candidate_approved';
  }
  if (evaluation.status === 'rejected') {
    return evaluation.languageAccepted === false
      ? 'candidate_language_rejected'
      : 'candidate_rejected';
  }
  if (evaluation.status === 'skipped') {
    return 'evaluation_skipped';
  }
  return 'evaluation_failed';
};

export const resolveAmazonEvaluationMessage = (
  evaluation: ProductScanAmazonEvaluation
): string => {
  if (!evaluation) {
    return 'Amazon candidate AI evaluation failed.';
  }
  const confidenceLabel = formatAmazonEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return confidenceLabel
      ? `AI evaluator approved the Amazon candidate (${confidenceLabel}).`
      : 'AI evaluator approved the Amazon candidate.';
  }
  if (evaluation.status === 'rejected') {
    if (evaluation.languageAccepted === false) {
      return confidenceLabel
        ? `AI evaluator rejected the Amazon candidate because page content is not English (${confidenceLabel}).`
        : 'AI evaluator rejected the Amazon candidate because page content is not English.';
    }
    return confidenceLabel
      ? `AI evaluator rejected the Amazon candidate (${confidenceLabel}).`
      : 'AI evaluator rejected the Amazon candidate.';
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.'
    );
  }
  return evaluation.error ?? 'Amazon candidate AI evaluation failed.';
};

export const formatAmazonEvaluatorAllowedContentLanguage = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['allowedContentLanguage'] | null | undefined
): string => {
  if (!value || value === 'en') {
    return 'English';
  }

  return String(value).toUpperCase();
};

export const formatAmazonEvaluatorLanguageDetectionMode = (
  value:
    | ProductScannerAmazonCandidateEvaluatorResolvedConfig['languageDetectionMode']
    | null
    | undefined
): string => {
  if (value === 'ai_only') {
    return 'AI only';
  }

  return 'Deterministic first, then AI';
};

export const formatAmazonEvaluatorModelSource = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['mode'] | null | undefined
): string | null => {
  if (value === 'brain_default') {
    return 'AI Brain default';
  }

  if (value === 'model_override') {
    return 'Scanner override';
  }

  return null;
};

export const resolveAmazonEvaluationRejectionKindLabel = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string | null => {
  if (evaluation?.status !== 'rejected') {
    return null;
  }

  return evaluation.languageAccepted === false ? 'Language gate' : 'Product mismatch';
};

export const resolveNextAmazonCandidateUrl = (input: {
  candidateUrls: string[];
  currentUrl: string | null;
}): {
  nextUrl: string | null;
  nextRank: number | null;
  remainingCandidateUrls: string[];
} => {
  const normalizedUrls = input.candidateUrls.filter(
    (value, index, values) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      values.findIndex((entry) => entry === value) === index
  );
  if (normalizedUrls.length === 0) {
    return {
      nextUrl: null,
      nextRank: null,
      remainingCandidateUrls: [],
    };
  }

  const currentIndex = input.currentUrl ? normalizedUrls.indexOf(input.currentUrl) : -1;
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const nextUrl = normalizedUrls[nextIndex] ?? null;
  return {
    nextUrl,
    nextRank: nextUrl ? nextIndex + 1 : null,
    remainingCandidateUrls: nextUrl ? normalizedUrls.slice(nextIndex) : [],
  };
};

export const resolveNextQueueStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    1,
    ...steps
      .filter((step) => step.key === 'queue_scan')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

export const resolveNextAmazonEvaluationStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'amazon_ai_evaluate')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

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
  evaluation: ProductScanSupplierEvaluation
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
  evaluation: ProductScanSupplierEvaluation
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
  evaluation: ProductScanSupplierEvaluation
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
  evaluation: ProductScanSupplierEvaluation,
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
      typeof evaluation?.sameProduct === 'boolean' ? String(evaluation.sameProduct) : null,
  },
  {
    label: 'Image match',
    value:
      typeof evaluation?.imageMatch === 'boolean' ? String(evaluation.imageMatch) : null,
  },
  {
    label: 'Title match',
    value:
      typeof evaluation?.titleMatch === 'boolean' ? String(evaluation.titleMatch) : null,
  },
  {
    label: 'Proceed',
    value: typeof evaluation?.proceed === 'boolean' ? String(evaluation.proceed) : null,
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

export const resolveLatestAmazonCandidateStepMeta = (
  steps: ProductScanRecord['steps']
): {
  candidateId: string | null;
  candidateRank: number | null;
  url: string | null;
} => {
  const latestCandidateStep =
    [...steps].reverse().find((step) =>
      step.key === 'amazon_extract' ||
      step.key === 'amazon_probe' ||
      step.key === 'amazon_content_ready' ||
      step.key === 'amazon_open'
    ) ?? null;

  return {
    candidateId: latestCandidateStep?.candidateId?.trim() || null,
    candidateRank:
      typeof latestCandidateStep?.candidateRank === 'number' &&
      Number.isFinite(latestCandidateStep.candidateRank) &&
      latestCandidateStep.candidateRank > 0
        ? latestCandidateStep.candidateRank
        : null,
    url: latestCandidateStep?.url?.trim() || null,
  };
};

export const buildAmazonEvaluationStepDetails = (
  evaluation: ProductScanAmazonEvaluation,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  stage: 'probe' | 'extraction'
): Array<{ label: string; value: string | null }> => [
  {
    label: 'Evaluation stage',
    value: stage === 'probe' ? 'Probe' : 'Extraction',
  },
  { label: 'Model', value: evaluation?.modelId ?? null },
  {
    label: 'Model source',
    value: formatAmazonEvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatAmazonEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous Amazon candidates only'
      : 'Every Amazon candidate',
  },
  {
    label: 'Allowed content language',
    value: formatAmazonEvaluatorAllowedContentLanguage(evaluatorConfig.allowedContentLanguage),
  },
  {
    label: 'Language policy',
    value: evaluatorConfig.rejectNonEnglishContent !== false
      ? 'Reject non-English content'
      : 'Allow non-English content',
  },
  {
    label: 'Language detection',
    value: formatAmazonEvaluatorLanguageDetectionMode(evaluatorConfig.languageDetectionMode),
  },
  {
    label: 'Rejection kind',
    value: resolveAmazonEvaluationRejectionKindLabel(evaluation),
  },
  {
    label: 'Confidence',
    value: formatAmazonEvaluationConfidence(evaluation?.confidence),
  },
  {
    label: 'Same product',
    value:
      typeof evaluation?.sameProduct === 'boolean' ? String(evaluation.sameProduct) : null,
  },
  {
    label: 'Image match',
    value:
      typeof evaluation?.imageMatch === 'boolean' ? String(evaluation.imageMatch) : null,
  },
  {
    label: 'Description match',
    value:
      typeof evaluation?.descriptionMatch === 'boolean'
        ? String(evaluation.descriptionMatch)
        : null,
  },
  {
    label: 'Page language',
    value: evaluation?.pageLanguage ?? null,
  },
  {
    label: 'Language accepted',
    value:
      typeof evaluation?.languageAccepted === 'boolean'
        ? String(evaluation.languageAccepted)
        : null,
  },
  {
    label: 'Language confidence',
    value: formatAmazonEvaluationConfidence(evaluation?.languageConfidence),
  },
  {
    label: 'Language reason',
    value: evaluation?.languageReason ?? null,
  },
  {
    label: 'Scrape allowed',
    value:
      typeof evaluation?.scrapeAllowed === 'boolean' ? String(evaluation.scrapeAllowed) : null,
  },
  {
    label: 'Candidate URL',
    value: evaluation?.evidence?.candidateUrl ?? null,
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

export const isApprovedAmazonCandidateExtractionRun = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'amazonEvaluation'>
): boolean =>
  toRecord(scan.rawResult)?.['approvedCandidateExtraction'] === true &&
  (scan.amazonEvaluation?.status === 'approved' || scan.amazonEvaluation?.status === 'skipped');
