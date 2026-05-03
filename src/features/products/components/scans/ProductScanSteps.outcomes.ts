import type { ProductScanStep } from '@/shared/contracts/product-scans';

import { resolveProductScanFailureSourceLabel } from './ProductScanSteps.failure';
import type {
  ProductScanActiveStepSummary,
  ProductScanLatestOutcomeSummary,
} from './ProductScanSteps.types';
import {
  formatResultCode,
  formatStepTiming,
  getStepGroupLabel,
  resolveNonEmptyString,
  resolveStepAttempt,
  resolveStepGroup,
  resolveStepUrl,
} from './ProductScanSteps.utils';

const isActiveStep = (step: ProductScanStep): boolean =>
  step.status === 'running' || step.status === 'pending';

const isStalledOutcomeStep = (step: ProductScanStep): boolean =>
  step.status === 'completed' || step.status === 'skipped';

const findLatestStep = (
  steps: ProductScanStep[],
  predicate: (step: ProductScanStep) => boolean
): ProductScanStep | null => [...steps].reverse().find(predicate) ?? null;

export const resolveProductScanActiveStepSummary = (
  steps: ProductScanStep[]
): ProductScanActiveStepSummary | null => {
  const activeStep = findLatestStep(steps, isActiveStep);
  if (activeStep === null) return null;
  const message = activeStep.message ?? activeStep.warning;
  return {
    phaseLabel: getStepGroupLabel(resolveStepGroup(activeStep)),
    stepLabel: activeStep.label,
    message: resolveNonEmptyString(message),
    attempt: resolveStepAttempt(activeStep),
    inputSource: activeStep.inputSource ?? null,
  };
};

const buildOutcomeSummary = (
  step: ProductScanStep,
  kind: ProductScanLatestOutcomeSummary['kind']
): ProductScanLatestOutcomeSummary => {
  const message = step.message ?? step.warning;
  return {
    kind,
    phaseLabel: getStepGroupLabel(resolveStepGroup(step)),
    sourceLabel: resolveProductScanFailureSourceLabel(step),
    stepLabel: step.label,
    message: resolveNonEmptyString(message),
    resultCodeLabel: formatResultCode(step.resultCode),
    attempt: resolveStepAttempt(step),
    inputSource: step.inputSource ?? null,
    url: resolveStepUrl(step),
    timingLabel: formatStepTiming(step),
  };
};

export const resolveProductScanLatestOutcomeSummary = (
  steps: ProductScanStep[],
  options?: { allowStalled?: boolean }
): ProductScanLatestOutcomeSummary | null => {
  const failedStep = findLatestStep(steps, (step) => step.status === 'failed');
  if (failedStep !== null) return buildOutcomeSummary(failedStep, 'failed');
  if (options?.allowStalled !== true) return null;
  const stalledStep = findLatestStep(steps, isStalledOutcomeStep);
  return stalledStep === null ? null : buildOutcomeSummary(stalledStep, 'stalled');
};
