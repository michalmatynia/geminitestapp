import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { readOptionalString } from './product-scans-service.helpers.base';

const readStepAttempt = (step: ProductScanRecord['steps'][number]): number =>
  typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1;

const resolveNextStepAttemptByKey = (
  steps: ProductScanRecord['steps'],
  key: ProductScanRecord['steps'][number]['key'],
  fallback: number
): number => Math.max(fallback, ...steps.filter((step) => step.key === key).map(readStepAttempt)) + 1;

export const resolveNextQueueStepAttempt = (steps: ProductScanRecord['steps']): number =>
  resolveNextStepAttemptByKey(steps, 'queue_scan', 1);

export const resolveNextAmazonEvaluationStepAttempt = (steps: ProductScanRecord['steps']): number =>
  resolveNextStepAttemptByKey(steps, 'amazon_ai_evaluate', 0);

export const resolveNextAmazonCandidateTriageStepAttempt = (
  steps: ProductScanRecord['steps']
): number => resolveNextStepAttemptByKey(steps, 'amazon_ai_triage', 0);

const isLatestAmazonCandidateStep = (step: ProductScanRecord['steps'][number]): boolean =>
  step.key === 'amazon_extract' ||
  step.key === 'amazon_probe' ||
  step.key === 'amazon_content_ready' ||
  step.key === 'amazon_open';

const resolveCandidateStepRank = (
  step: ProductScanRecord['steps'][number] | null
): number | null => {
  if (step === null) return null;
  if (typeof step.candidateRank !== 'number') return null;
  if (!Number.isFinite(step.candidateRank) || step.candidateRank <= 0) return null;
  return step.candidateRank;
};

export const resolveLatestAmazonCandidateStepMeta = (
  steps: ProductScanRecord['steps']
): {
  candidateId: string | null;
  candidateRank: number | null;
  url: string | null;
} => {
  const latestCandidateStep = [...steps].reverse().find(isLatestAmazonCandidateStep) ?? null;
  const candidateId = readOptionalString(latestCandidateStep?.candidateId) ?? '';
  const url = readOptionalString(latestCandidateStep?.url) ?? '';
  return {
    candidateId: candidateId !== '' ? candidateId : null,
    candidateRank: resolveCandidateStepRank(latestCandidateStep),
    url: url !== '' ? url : null,
  };
};
