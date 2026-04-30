import type { ProductScanStep } from '@/shared/contracts/product-scans';

import type {
  ProductScanEvaluationExecutionSummary,
  ProductScanEvaluationPolicySummary,
} from './ProductScanSteps.types';
import { resolveStepDetailValue } from './ProductScanSteps.utils';

const EVALUATION_STEP_KEYS = new Set([
  'amazon_ai_triage',
  'amazon_ai_evaluate',
  'supplier_ai_evaluate',
]);

const isEvaluationStep = (step: Pick<ProductScanStep, 'key'>): boolean =>
  EVALUATION_STEP_KEYS.has(step.key);

const resolveAmazonEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): ProductScanEvaluationExecutionSummary | null => {
  if (step.key !== 'amazon_ai_triage' && step.key !== 'amazon_ai_evaluate') return null;
  if (step.resultCode === 'evaluation_skipped' || step.status === 'skipped') {
    return {
      badgeLabel: 'Deterministic bypass',
      detailLabel:
        step.key === 'amazon_ai_triage'
          ? 'Bypassed on deterministic candidate ranking'
          : 'Bypassed on deterministic match',
    };
  }
  return {
    badgeLabel: 'Reviewed by AI',
    detailLabel: null,
  };
};

const resolveSupplierEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): ProductScanEvaluationExecutionSummary | null => {
  if (step.key !== 'supplier_ai_evaluate') return null;
  if (step.resultCode === 'evaluation_skipped' || step.status === 'skipped') {
    return {
      badgeLabel: 'Deterministic bypass',
      detailLabel: 'Bypassed on deterministic supplier match',
    };
  }
  return {
    badgeLabel: 'Reviewed by AI',
    detailLabel: null,
  };
};

export const resolveEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): ProductScanEvaluationExecutionSummary | null =>
  resolveAmazonEvaluationExecutionSummary(step) ?? resolveSupplierEvaluationExecutionSummary(step);

const resolveLanguageGateLabel = (
  step: Pick<ProductScanStep, 'details'>
): string | null => {
  const allowedContentLanguage = resolveStepDetailValue(step, 'Allowed content language');
  const languagePolicy = resolveStepDetailValue(step, 'Language policy');
  if (allowedContentLanguage === null) return languagePolicy;
  if (languagePolicy === 'Reject non-English content') return `${allowedContentLanguage} only`;
  if (languagePolicy !== null) return `${allowedContentLanguage} · ${languagePolicy}`;
  return allowedContentLanguage;
};

const hasEvaluationPolicySummary = (summary: ProductScanEvaluationPolicySummary): boolean =>
  Object.values(summary).some((value) => value !== null);

export const resolveProductScanEvaluationPolicySummaryFromStep = (
  step: Pick<ProductScanStep, 'key' | 'details' | 'resultCode' | 'status'> | null | undefined
): ProductScanEvaluationPolicySummary | null => {
  if (step === null || step === undefined || !isEvaluationStep(step)) return null;
  const summary: ProductScanEvaluationPolicySummary = {
    executionLabel: resolveEvaluationExecutionSummary(step)?.badgeLabel ?? null,
    modelSource: resolveStepDetailValue(step, 'Model source'),
    modelLabel: resolveStepDetailValue(step, 'Model'),
    thresholdLabel: resolveStepDetailValue(step, 'Threshold'),
    scopeLabel: resolveStepDetailValue(step, 'Evaluation scope'),
    similarityDecisionLabel: resolveStepDetailValue(step, 'Similarity decision'),
    languageGateLabel: resolveLanguageGateLabel(step),
    languageDetectionLabel: resolveStepDetailValue(step, 'Language detection'),
  };
  return hasEvaluationPolicySummary(summary) ? summary : null;
};

export const resolveProductScanEvaluationPolicySummary = (
  steps: ProductScanStep[]
): ProductScanEvaluationPolicySummary | null => {
  const evaluationStep = [...steps].reverse().find(isEvaluationStep) ?? null;
  return resolveProductScanEvaluationPolicySummaryFromStep(evaluationStep);
};
