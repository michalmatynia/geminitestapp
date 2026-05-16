import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import type {
  ProductScanAmazonEvaluation,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import {
  resolveAmazonRuntimeOperationLabel,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import type {
  ProductScanCandidateTriageEvaluationResult,
} from './product-scan-ai-evaluator';
import { readOptionalString, resolvePersistableScanUrl, toRecord } from './product-scans-service.helpers.base';
import { formatEvaluationConfidence } from './product-scans-service.helpers.amazon.constants';

type KnownProductScanAmazonEvaluation = NonNullable<ProductScanAmazonEvaluation>;

export const resolveAmazonEvaluationStepStatus = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (evaluation === undefined || evaluation === null) return 'failed';
  if (evaluation.status === 'approved') return 'completed';
  if (evaluation.status === 'skipped') return 'skipped';
  return 'failed';
};

export const resolveAmazonCandidateTriageStepStatus = (
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (evaluation === undefined || evaluation === null) return 'failed';
  if (evaluation.status === 'approved') return 'completed';
  if (evaluation.status === 'skipped') return 'skipped';
  return 'failed';
};

export const resolveAmazonCandidateTriageStepResultCode = (
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) return 'triage_failed';
  if (evaluation.status === 'approved') return 'candidates_triaged';
  if (evaluation.status === 'skipped') return 'triage_skipped';
  if (evaluation.recommendedAction === 'fallback_provider') return 'provider_fallback_requested';
  return 'triage_rejected';
};

const resolveApprovedTriageMessage = (
  evaluation: ProductScanCandidateTriageEvaluationResult
): string =>
  evaluation.keptCandidateUrls.length > 1
    ? `Amazon candidate triage kept ${evaluation.keptCandidateUrls.length} candidates and reranked them.`
    : 'Amazon candidate triage selected the best candidate.';

const resolveKnownTriageMessage = (
  evaluation: ProductScanCandidateTriageEvaluationResult
): string => {
  const firstReason = evaluation.reasons[0] ?? null;
  if (evaluation.recommendedAction === 'fallback_provider') {
    return 'Amazon candidate triage requested a fallback image-search provider.';
  }
  return resolveTriageMessageByStatus(evaluation, firstReason);
};

const resolveTriageMessageByStatus = (
  evaluation: ProductScanCandidateTriageEvaluationResult,
  firstReason: string | null
): string => {
  if (evaluation.status === 'approved') return resolveApprovedTriageMessage(evaluation);
  if (evaluation.status === 'skipped') {
    return firstReason ?? 'Skipped Amazon candidate triage because deterministic hints already identified the best candidate.';
  }
  if (evaluation.status === 'rejected') {
    return firstReason ?? 'Amazon candidate triage rejected the current Google candidate set.';
  }
  return evaluation.error ?? 'Amazon candidate triage failed.';
};

export const resolveAmazonCandidateTriageMessage = (
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) return 'Amazon candidate triage failed.';
  return resolveKnownTriageMessage(evaluation);
};

export const formatAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = readOptionalString(value, 160);
  if (normalized === null || normalized === '') return null;
  return normalized.replace(/[_-]+/g, ' ').trim();
};

export const humanizeAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = formatAmazonRuntimeStageLabel(value);
  if (normalized === null || normalized === '') return null;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const readRecordArray = (value: unknown): unknown[] | null =>
  Array.isArray(value) ? value : null;

const readFirstOptionalString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const normalized = readOptionalString(value);
    if (normalized !== null && normalized !== '') return normalized;
  }
  return null;
};

const buildOptionalDiagnosticFields = (
  metaRecord: Record<string, unknown>,
  metaRawResult: Record<string, unknown>
): Record<string, unknown> => {
  const runId = readFirstOptionalString(metaRecord['runId'], metaRawResult['runId']);
  const runStatus = readFirstOptionalString(metaRecord['runStatus'], metaRawResult['runStatus']);
  const latestStage = readFirstOptionalString(
    metaRecord['latestStage'],
    metaRawResult['latestStage'],
    metaRawResult['stage']
  );
  const finalUrl = resolvePersistableScanUrl(metaRecord['finalUrl'], metaRawResult['finalUrl']);
  const latestStageUrl = resolvePersistableScanUrl(
    metaRecord['latestStageUrl'],
    metaRawResult['latestStageUrl'],
    metaRawResult['currentUrl']
  );
  return {
    ...(runId !== null ? { runId } : {}),
    ...(runStatus !== null ? { runStatus } : {}),
    ...(latestStage !== null ? { latestStage } : {}),
    ...(finalUrl !== null ? { finalUrl } : {}),
    ...(latestStageUrl !== null ? { latestStageUrl } : {}),
  };
};

const resolveFailureArtifacts = (
  metaRecord: Record<string, unknown>,
  metaRawResult: Record<string, unknown>
): unknown[] | null =>
  readRecordArray(metaRecord['failureArtifacts']) ?? readRecordArray(metaRawResult['failureArtifacts']);

const resolveLogTail = (
  metaRecord: Record<string, unknown>,
  metaRawResult: Record<string, unknown>
): unknown[] | null =>
  readRecordArray(metaRecord['logTail']) ?? readRecordArray(metaRawResult['logTail']);

const resolveRuntimePosture = (
  metaRecord: Record<string, unknown>,
  metaRawResult: Record<string, unknown>
): Record<string, unknown> | null =>
  toRecord(metaRecord['runtimePosture']) ?? toRecord(metaRawResult['runtimePosture']);

export const buildAmazonActiveRunDiagnostics = (
  run: PlaywrightEngineRunRecord
): Record<string, unknown> => {
  const metaRecord = toRecord(buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true })) ?? {};
  const metaRawResult = toRecord(metaRecord['rawResult']) ?? {};
  const failureArtifacts = resolveFailureArtifacts(metaRecord, metaRawResult);
  const logTail = resolveLogTail(metaRecord, metaRawResult);
  const runtimePosture = resolveRuntimePosture(metaRecord, metaRawResult);
  return {
    ...metaRawResult,
    ...buildOptionalDiagnosticFields(metaRecord, metaRawResult),
    ...(failureArtifacts !== null ? { failureArtifacts } : {}),
    ...(logTail !== null ? { logTail } : {}),
    ...(runtimePosture !== null ? { runtimePosture } : {}),
  };
};

export const resolveAmazonActiveRunStallMessage = ({
  reason,
  latestStage,
  runtimeKey,
}: {
  reason: 'runtime_exceeded' | 'no_progress' | 'manual_verification_expired';
  latestStage: string | null;
  runtimeKey?: string | null;
}): string => {
  const displayStage = humanizeAmazonRuntimeStageLabel(latestStage);
  const operationLabel = resolveAmazonRuntimeOperationLabel(runtimeKey);
  if (reason === 'manual_verification_expired') {
    return displayStage !== null
      ? `Google Lens manual verification expired at ${displayStage}.`
      : 'Google Lens manual verification expired before completion.';
  }
  if (reason === 'no_progress') {
    return displayStage !== null
      ? `${operationLabel} stalled at ${displayStage}.`
      : `${operationLabel} stopped making progress.`;
  }
  return displayStage !== null
    ? `${operationLabel} timed out at ${displayStage}.`
    : `${operationLabel} exceeded its runtime limit.`;
};

export const shouldKeepAmazonManualVerificationPending = (input: {
  parsedStatus: string | null;
  existingPending: boolean;
  latestStage: string | null;
}): boolean => {
  const waitingForManualVerification = isWaitingForAmazonManualVerification(input);
  if (!waitingForManualVerification) return false;
  const normalizedStage = input.latestStage?.trim().toLowerCase() ?? null;
  if (normalizedStage === null) return true;
  return !(
    normalizedStage.startsWith('amazon_') ||
    normalizedStage.startsWith('supplier_') ||
    normalizedStage === 'product_asin_update'
  );
};

const isWaitingForAmazonManualVerification = (input: {
  parsedStatus: string | null;
  existingPending: boolean;
}): boolean => {
  if (input.parsedStatus === 'captcha_required') return true;
  if (input.existingPending !== true) return false;
  return input.parsedStatus === 'running' || input.parsedStatus === null;
};

export const resolveAmazonEvaluationStepResultCode = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) return 'evaluation_failed';
  if (evaluation.status === 'approved') return 'candidate_approved';
  if (evaluation.status === 'rejected') {
    return evaluation.languageAccepted === false ? 'candidate_language_rejected' : 'candidate_rejected';
  }
  if (evaluation.status === 'skipped') return 'evaluation_skipped';
  return 'evaluation_failed';
};

const resolveRejectedEvaluationMessage = (
  evaluation: KnownProductScanAmazonEvaluation,
  confidenceLabel: string | null
): string => {
  if (evaluation.languageAccepted === false) {
    return confidenceLabel !== null
      ? `AI evaluator rejected the Amazon candidate because page content is not English (${confidenceLabel}).`
      : 'AI evaluator rejected the Amazon candidate because page content is not English.';
  }
  return confidenceLabel !== null
    ? `AI evaluator rejected the Amazon candidate (${confidenceLabel}).`
    : 'AI evaluator rejected the Amazon candidate.';
};

const resolveKnownEvaluationMessage = (
  evaluation: KnownProductScanAmazonEvaluation,
  confidenceLabel: string | null
): string => {
  if (evaluation.status === 'approved') {
    return confidenceLabel !== null
      ? `AI evaluator approved the Amazon candidate (${confidenceLabel}).`
      : 'AI evaluator approved the Amazon candidate.';
  }
  if (evaluation.status === 'rejected') return resolveRejectedEvaluationMessage(evaluation, confidenceLabel);
  if (evaluation.status === 'skipped') {
    return evaluation.reasons[0] ?? 'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.';
  }
  return evaluation.error ?? 'Amazon candidate AI evaluation failed.';
};

export const resolveAmazonEvaluationMessage = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) return 'Amazon candidate AI evaluation failed.';
  return resolveKnownEvaluationMessage(evaluation, formatEvaluationConfidence(evaluation.confidence));
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
    return { nextRank: null, nextUrl: null, remainingCandidateUrls: [] };
  }
  const currentIndex = input.currentUrl !== null ? normalizedUrls.indexOf(input.currentUrl) : -1;
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const nextUrl = normalizedUrls[nextIndex] ?? null;
  return {
    nextRank: nextUrl !== null ? nextIndex + 1 : null,
    nextUrl,
    remainingCandidateUrls: nextUrl !== null ? normalizedUrls.slice(nextIndex) : [],
  };
};
