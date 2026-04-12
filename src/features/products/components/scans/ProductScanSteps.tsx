'use client';

import { ExternalLink } from 'lucide-react';

import type { ProductScanStep } from '@/shared/contracts/product-scans';

const STEP_STATUS_LABELS: Record<ProductScanStep['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
};

const STEP_STATUS_CLASSES: Record<ProductScanStep['status'], string> = {
  pending: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  failed: 'border-destructive/40 text-destructive',
  skipped: 'border-border/70 text-muted-foreground',
};

const STEP_GROUP_LABELS: Record<NonNullable<ProductScanStep['group']>, string> = {
  input: 'Input',
  google_lens: 'Google Lens',
  amazon: 'Amazon',
  supplier: 'Supplier',
  product: 'Product Update',
};

const STEP_GROUP_ORDER: Record<NonNullable<ProductScanStep['group']>, number> = {
  input: 0,
  google_lens: 1,
  amazon: 2,
  supplier: 3,
  product: 4,
};

const resolveStepGroup = (
  step: Pick<ProductScanStep, 'group' | 'key'>
): NonNullable<ProductScanStep['group']> => {
  if (step.group) {
    return step.group;
  }
  if (step.key === 'validate' || step.key === 'prepare_scan' || step.key === 'queue_scan') {
    return 'input';
  }
  if (step.key.startsWith('google_')) {
    return 'google_lens';
  }
  if (step.key.startsWith('amazon_')) {
    return 'amazon';
  }
  return 'product';
};

export type ProductScanActiveStepSummary = {
  phaseLabel: string;
  stepLabel: string;
  message: string | null;
  attempt: number | null;
  inputSource: ProductScanStep['inputSource'];
};

export type ProductScanLatestOutcomeSummary = {
  kind: 'failed' | 'stalled';
  phaseLabel: string;
  sourceLabel: string | null;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  inputSource: ProductScanStep['inputSource'];
  url: string | null;
  timingLabel: string | null;
};

export type ProductScanContinuationSummary = {
  phaseLabel: string;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  nextUrl: string | null;
  rejectedUrl: string | null;
  rejectionKind: 'language' | 'product' | null;
};

export type ProductScanRejectedCandidateSummary = {
  rejectedCount: number;
  languageRejectedCount: number;
  latestRejectedUrl: string | null;
  latestReason: string | null;
  latestRejectionKind: 'language' | 'product' | null;
};

export type ProductScanEvaluationPolicySummary = {
  executionLabel: 'Reviewed by AI' | 'Deterministic bypass' | null;
  modelSource: string | null;
  modelLabel: string | null;
  thresholdLabel: string | null;
  scopeLabel: string | null;
  similarityDecisionLabel: string | null;
  languageGateLabel: string | null;
  languageDetectionLabel: string | null;
};

type AmazonEvaluationExecutionSummary = {
  badgeLabel: 'Reviewed by AI' | 'Deterministic bypass';
  detailLabel: string | null;
};

export const resolveProductScanActiveStepSummary = (
  steps: ProductScanStep[]
): ProductScanActiveStepSummary | null => {
  const activeStep =
    [...steps].reverse().find((step) => step.status === 'running' || step.status === 'pending') ?? null;

  if (!activeStep) {
    return null;
  }

  return {
    phaseLabel: STEP_GROUP_LABELS[resolveStepGroup(activeStep)],
    stepLabel: activeStep.label,
    message: activeStep.message ?? activeStep.warning ?? null,
    attempt: activeStep.attempt ?? null,
    inputSource: activeStep.inputSource ?? null,
  };
};

export const resolveProductScanFailureSourceLabel = (
  step: Pick<ProductScanStep, 'group' | 'key'>
): string | null => {
  const group = resolveStepGroup(step);

  if (group === 'input') {
    return 'Input setup';
  }

  if (group === 'google_lens') {
    if (step.key === 'google_upload') {
      return 'Google entry';
    }

    if (step.key === 'google_candidates') {
      return 'Candidate collection';
    }

    return 'Google results';
  }

  if (group === 'amazon') {
    if (step.key === 'amazon_open' || step.key === 'amazon_overlays' || step.key === 'amazon_content_ready') {
      return 'Amazon page';
    }

    if (step.key === 'amazon_extract') {
      return 'Amazon extraction';
    }

    return 'Amazon page';
  }

  if (group === 'supplier') {
    if (step.key === 'supplier_ai_evaluate') {
      return 'Supplier evaluator';
    }

    if (
      step.key === 'supplier_open' ||
      step.key === 'supplier_content_ready' ||
      step.key === 'supplier_overlays'
    ) {
      return 'Supplier page';
    }

    if (step.key === 'supplier_extract') {
      return 'Supplier extraction';
    }

    return 'Supplier page';
  }

  return 'Product update';
};

export const resolveProductScanLatestOutcomeSummary = (
  steps: ProductScanStep[],
  options?: { allowStalled?: boolean }
): ProductScanLatestOutcomeSummary | null => {
  const failedStep = [...steps].reverse().find((step) => step.status === 'failed') ?? null;

  if (failedStep) {
    return {
      kind: 'failed',
      phaseLabel: STEP_GROUP_LABELS[resolveStepGroup(failedStep)],
      sourceLabel: resolveProductScanFailureSourceLabel(failedStep),
      stepLabel: failedStep.label,
      message: failedStep.message ?? failedStep.warning ?? null,
      resultCodeLabel: formatResultCode(failedStep.resultCode),
      attempt: failedStep.attempt ?? null,
      inputSource: failedStep.inputSource ?? null,
      url: failedStep.url ?? null,
      timingLabel: formatStepTiming(failedStep),
    };
  }

  if (!options?.allowStalled) {
    return null;
  }

  const stalledStep =
    [...steps].reverse().find((step) => step.status === 'completed' || step.status === 'skipped') ?? null;

  if (!stalledStep) {
    return null;
  }

  return {
    kind: 'stalled',
    phaseLabel: STEP_GROUP_LABELS[resolveStepGroup(stalledStep)],
    sourceLabel: resolveProductScanFailureSourceLabel(stalledStep),
    stepLabel: stalledStep.label,
    message: stalledStep.message ?? stalledStep.warning ?? null,
    resultCodeLabel: formatResultCode(stalledStep.resultCode),
    attempt: stalledStep.attempt ?? null,
    inputSource: stalledStep.inputSource ?? null,
    url: stalledStep.url ?? null,
    timingLabel: formatStepTiming(stalledStep),
  };
};

const resolveStepDetailValue = (
  step: Pick<ProductScanStep, 'details'>,
  label: string
): string | null => {
  const details = Array.isArray(step.details) ? step.details : [];
  const matchedDetail = details.find((entry) => entry.label === label);
  return typeof matchedDetail?.value === 'string' && matchedDetail.value.trim().length > 0
    ? matchedDetail.value.trim()
    : null;
};

const resolveAmazonEvaluationRejectionKind = (
  step: Pick<ProductScanStep, 'resultCode' | 'details'>
): 'language' | 'product' | null => {
  if (step.resultCode === 'candidate_language_rejected') {
    return 'language';
  }

  if (step.resultCode === 'candidate_rejected') {
    return 'product';
  }

  const rejectionKind = resolveStepDetailValue(step, 'Rejection kind')?.toLowerCase() ?? null;
  if (!rejectionKind) {
    return null;
  }

  if (rejectionKind.includes('language')) {
    return 'language';
  }

  if (rejectionKind.includes('product')) {
    return 'product';
  }

  return null;
};

const resolveSupplierEvaluationRejectionKind = (
  step: Pick<ProductScanStep, 'resultCode'>
): 'product' | null => {
  if (step.resultCode === 'candidate_rejected') {
    return 'product';
  }

  return null;
};

const resolveAmazonCandidateContinuationRejectionKind = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message' | 'resultCode' | 'details'>
): 'language' | 'product' | null => {
  const explicitKind = resolveAmazonEvaluationRejectionKind(step);
  if (explicitKind) {
    return explicitKind;
  }

  if (step.message?.includes('language rejection')) {
    return 'language';
  }

  return isAmazonCandidateContinuationStep(step) ? 'product' : null;
};

const isAmazonCandidateContinuationStep = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message'>
): boolean =>
  step.key === 'queue_scan' &&
  (step.label === 'Continue with next Amazon candidate' ||
    step.message?.includes('next Amazon candidate after AI rejection') ||
    step.message?.includes('next Amazon candidate after language rejection') ||
    false);

export const resolveProductScanContinuationSummary = (
  steps: ProductScanStep[]
): ProductScanContinuationSummary | null => {
  const continuationStep =
    [...steps]
      .reverse()
      .find(
        (step) => isAmazonCandidateContinuationStep(step)
      ) ?? null;

  if (!continuationStep) {
    return null;
  }

  return {
    phaseLabel: STEP_GROUP_LABELS[resolveStepGroup(continuationStep)],
    stepLabel: continuationStep.label,
    message: continuationStep.message ?? null,
    resultCodeLabel: formatResultCode(continuationStep.resultCode),
    attempt: continuationStep.attempt ?? null,
    nextUrl: resolveStepDetailValue(continuationStep, 'Next candidate URL'),
    rejectedUrl: resolveStepDetailValue(continuationStep, 'Rejected candidate URL'),
    rejectionKind: resolveAmazonCandidateContinuationRejectionKind(continuationStep),
  };
};

export const resolveProductScanRejectedCandidateSummary = (
  steps: ProductScanStep[]
): ProductScanRejectedCandidateSummary | null => {
  const rejectedEvaluationSteps = steps.filter(
    (step) =>
      (step.key === 'amazon_ai_evaluate' &&
        (step.resultCode === 'candidate_rejected' ||
          step.resultCode === 'candidate_language_rejected')) ||
      (step.key === 'supplier_ai_evaluate' && step.resultCode === 'candidate_rejected')
  );

  if (rejectedEvaluationSteps.length === 0) {
    return null;
  }

  const latestRejectedStep = [...rejectedEvaluationSteps].reverse()[0] ?? null;
  if (!latestRejectedStep) {
    return null;
  }

  const languageRejectedCount = rejectedEvaluationSteps.filter(
    (step) => resolveAmazonEvaluationRejectionKind(step) === 'language'
  ).length;
  const latestAmazonRejectionKind = resolveAmazonEvaluationRejectionKind(latestRejectedStep);
  const latestSupplierRejectionKind = resolveSupplierEvaluationRejectionKind(latestRejectedStep);

  return {
    rejectedCount: rejectedEvaluationSteps.length,
    languageRejectedCount,
    latestRejectedUrl: latestRejectedStep.url ?? resolveStepDetailValue(latestRejectedStep, 'Candidate URL'),
    latestReason:
      resolveStepDetailValue(latestRejectedStep, 'Reason') ??
      resolveStepDetailValue(latestRejectedStep, 'Mismatch') ??
      resolveStepDetailValue(latestRejectedStep, 'Language reason') ??
      latestRejectedStep.message ??
      null,
    latestRejectionKind: latestAmazonRejectionKind ?? latestSupplierRejectionKind,
  };
};

const resolveProductScanEvaluationPolicySummaryFromStep = (
  step: Pick<ProductScanStep, 'key' | 'details' | 'resultCode' | 'status'> | null | undefined
): ProductScanEvaluationPolicySummary | null => {
  if (step?.key !== 'amazon_ai_evaluate' && step?.key !== 'supplier_ai_evaluate') {
    return null;
  }

  const modelSource = resolveStepDetailValue(step, 'Model source');
  const modelLabel = resolveStepDetailValue(step, 'Model');
  const thresholdLabel = resolveStepDetailValue(step, 'Threshold');
  const scopeLabel = resolveStepDetailValue(step, 'Evaluation scope');
  const similarityDecisionLabel = resolveStepDetailValue(step, 'Similarity decision');
  const allowedContentLanguage = resolveStepDetailValue(step, 'Allowed content language');
  const languagePolicy = resolveStepDetailValue(step, 'Language policy');
  const languageDetectionLabel = resolveStepDetailValue(step, 'Language detection');
  const executionLabel = resolveEvaluationExecutionSummary(step)?.badgeLabel ?? null;

  let languageGateLabel: string | null = null;
  if (allowedContentLanguage && languagePolicy === 'Reject non-English content') {
    languageGateLabel = `${allowedContentLanguage} only`;
  } else if (allowedContentLanguage && languagePolicy) {
    languageGateLabel = `${allowedContentLanguage} · ${languagePolicy}`;
  } else {
    languageGateLabel = allowedContentLanguage ?? languagePolicy;
  }

  if (
    !executionLabel &&
    !modelSource &&
    !modelLabel &&
    !thresholdLabel &&
    !scopeLabel &&
    !similarityDecisionLabel &&
    !languageGateLabel &&
    !languageDetectionLabel
  ) {
    return null;
  }

  return {
    executionLabel,
    modelSource,
    modelLabel,
    thresholdLabel,
    scopeLabel,
    similarityDecisionLabel,
    languageGateLabel,
    languageDetectionLabel,
  };
};

const resolveAmazonEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): AmazonEvaluationExecutionSummary | null => {
  if (step.key !== 'amazon_ai_evaluate') {
    return null;
  }

  if (step.resultCode === 'evaluation_skipped' || step.status === 'skipped') {
    return {
      badgeLabel: 'Deterministic bypass',
      detailLabel: 'Bypassed on deterministic match',
    };
  }

  return {
    badgeLabel: 'Reviewed by AI',
    detailLabel: null,
  };
};

const resolveSupplierEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): AmazonEvaluationExecutionSummary | null => {
  if (step.key !== 'supplier_ai_evaluate') {
    return null;
  }

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

const resolveEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): AmazonEvaluationExecutionSummary | null =>
  resolveAmazonEvaluationExecutionSummary(step) ??
  resolveSupplierEvaluationExecutionSummary(step);

export const resolveProductScanEvaluationPolicySummary = (
  steps: ProductScanStep[]
): ProductScanEvaluationPolicySummary | null =>
  resolveProductScanEvaluationPolicySummaryFromStep(
    [...steps].reverse().find(
      (step) => step.key === 'amazon_ai_evaluate' || step.key === 'supplier_ai_evaluate'
    ) ?? null
  );

type ProductScanContinuationContext = {
  step: ProductScanStep;
  rejectedUrl: string | null;
  nextUrl: string | null;
  rejectionKind: 'language' | 'product' | null;
};

const resolveContinuationContexts = (
  steps: ProductScanStep[]
): Map<number, ProductScanContinuationContext> => {
  const contexts = new Map<number, ProductScanContinuationContext>();

  for (const step of steps) {
    if (
      !isAmazonCandidateContinuationStep(step) ||
      typeof step.attempt !== 'number' ||
      !Number.isFinite(step.attempt)
    ) {
      continue;
    }

    contexts.set(step.attempt, {
      step,
      rejectedUrl: resolveStepDetailValue(step, 'Rejected candidate URL'),
      nextUrl: resolveStepDetailValue(step, 'Next candidate URL'),
      rejectionKind: resolveAmazonCandidateContinuationRejectionKind(step),
    });
  }

  return contexts;
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDuration = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  const seconds = value / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainderSeconds}s`;
};

const formatStepTiming = (step: ProductScanStep): string | null => {
  const startedAt = step.startedAt ? formatTimestamp(step.startedAt) : null;
  const completedAt = step.completedAt ? formatTimestamp(step.completedAt) : null;
  const duration = formatDuration(step.durationMs);

  if (startedAt && completedAt && duration) {
    return `Started ${startedAt} · Completed ${completedAt} · Duration ${duration}`;
  }

  if (startedAt && completedAt) {
    return `Started ${startedAt} · Completed ${completedAt}`;
  }

  if (startedAt && duration) {
    return `Started ${startedAt} · Duration ${duration}`;
  }

  if (startedAt) {
    return `Started ${startedAt}`;
  }

  if (completedAt && duration) {
    return `Completed ${completedAt} · Duration ${duration}`;
  }

  if (completedAt) {
    return `Completed ${completedAt}`;
  }

  return null;
};

const formatResultCode = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function ProductScanSteps(props: { steps: ProductScanStep[] }): React.JSX.Element {
  const { steps } = props;
  const groupedSteps = steps
    .reduce<Array<{
      group: NonNullable<ProductScanStep['group']>;
      steps: ProductScanStep[];
    }>>((groups, step) => {
      const group = resolveStepGroup(step);
      const existingGroup = groups.find((entry) => entry.group === group);
      if (existingGroup) {
        existingGroup.steps.push(step);
        return groups;
      }
      return [...groups, { group, steps: [step] }];
    }, [])
    .sort((left, right) => STEP_GROUP_ORDER[left.group] - STEP_GROUP_ORDER[right.group]);

  const warningCount = steps.filter((step) => typeof step.warning === 'string' && step.warning.trim()).length;
  const failedCount = steps.filter((step) => step.status === 'failed').length;
  const retryCount = steps.filter((step) => typeof step.retryOf === 'string' && step.retryOf.trim()).length;
  const amazonCandidateAttemptCount = new Set(
    steps
      .filter((step) => resolveStepGroup(step) === 'amazon' && typeof step.attempt === 'number')
      .map((step) => step.attempt)
  ).size;
  const activeStepSummary = resolveProductScanActiveStepSummary(steps);
  const continuationContexts = resolveContinuationContexts(steps);

  return (
    <div className='space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <div className='flex flex-wrap gap-2'>
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          {steps.length} step{steps.length === 1 ? '' : 's'}
        </span>
        {warningCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
            {warningCount} warning{warningCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {failedCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-destructive/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-destructive'>
            {failedCount} failed
          </span>
        ) : null}
        {retryCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
            {retryCount} retr{retryCount === 1 ? 'y' : 'ies'}
          </span>
        ) : null}
        {amazonCandidateAttemptCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {amazonCandidateAttemptCount} Amazon candidate{amazonCandidateAttemptCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {activeStepSummary ? (
          <span className='inline-flex items-center rounded-md border border-blue-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-blue-300'>
            Active: {activeStepSummary.stepLabel}
          </span>
        ) : null}
      </div>
      {groupedSteps.map((group) => (
        <div key={group.group} className='space-y-2'>
          <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            {STEP_GROUP_LABELS[group.group]}
          </h5>
          <div className='space-y-2 border-l border-border/50 pl-3'>
            {group.steps.map((step, index) => {
              const timing = formatStepTiming(step);
              const stepDetails = Array.isArray(step.details) ? step.details : [];
              const resultCodeLabel = formatResultCode(step.resultCode);
              const continuationContext =
                typeof step.attempt === 'number' && Number.isFinite(step.attempt)
                  ? continuationContexts.get(step.attempt) ?? null
                  : null;
              const evaluationPolicySummary = resolveProductScanEvaluationPolicySummaryFromStep(step);
              const evaluationExecutionSummary = resolveEvaluationExecutionSummary(step);
              const isContinuationQueueStep =
                continuationContext?.step === step &&
                step.key === 'queue_scan' &&
                step.label === 'Continue with next Amazon candidate';
              const isContinuationAmazonStep =
                resolveStepGroup(step) === 'amazon' &&
                Boolean(continuationContext) &&
                continuationContext?.step !== step;
              return (
                <div
                  key={`${step.key}-${step.attempt ?? 1}-${step.inputSource ?? 'none'}-${index}`}
                  className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>{step.label}</span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STEP_STATUS_CLASSES[step.status]}`}
                    >
                      {STEP_STATUS_LABELS[step.status]}
                    </span>
                    {step.attempt ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        Attempt {step.attempt}
                      </span>
                    ) : null}
                    {typeof step.candidateRank === 'number' ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        Candidate #{step.candidateRank}
                      </span>
                    ) : null}
                    {step.inputSource ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        {step.inputSource === 'url' ? 'URL input' : 'File input'}
                      </span>
                    ) : null}
                    {resultCodeLabel ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        {resultCodeLabel}
                      </span>
                    ) : null}
                    {step.key === 'amazon_ai_evaluate' &&
                    resolveAmazonEvaluationRejectionKind(step) === 'language' ? (
                      <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                        Language gate
                      </span>
                    ) : null}
                    {evaluationExecutionSummary ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        {evaluationExecutionSummary.badgeLabel}
                      </span>
                    ) : null}
                    {isContinuationQueueStep ? (
                      <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                        {continuationContext?.rejectionKind === 'language'
                          ? 'Language rejection recovery'
                          : 'AI rejection recovery'}
                      </span>
                    ) : null}
                    {isContinuationAmazonStep ? (
                      <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                        {continuationContext?.rejectionKind === 'language'
                          ? 'Language recovery attempt'
                          : 'Recovery attempt'}
                      </span>
                    ) : null}
                  </div>
                  {step.message ? <p className='text-sm text-muted-foreground'>{step.message}</p> : null}
                  {step.warning ? (
                    <p className='text-xs font-medium text-amber-300'>{step.warning}</p>
                  ) : null}
                  {evaluationExecutionSummary?.detailLabel ? (
                    <p className='text-xs text-muted-foreground'>
                      {evaluationExecutionSummary.detailLabel}
                    </p>
                  ) : null}
                  {evaluationPolicySummary ? (
                    <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          AI evaluator policy
                        </span>
                        {evaluationPolicySummary.modelSource ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.modelSource}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.thresholdLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.thresholdLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.scopeLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.scopeLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.similarityDecisionLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.similarityDecisionLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.languageGateLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.languageGateLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.languageDetectionLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.languageDetectionLabel}
                          </span>
                        ) : null}
                      </div>
                      {evaluationPolicySummary.modelLabel ? (
                        <p className='text-xs text-muted-foreground'>
                          Model {evaluationPolicySummary.modelLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {isContinuationAmazonStep && continuationContext ? (
                    <p className='text-xs text-muted-foreground'>
                      Continues after{' '}
                      {continuationContext.rejectionKind === 'language'
                        ? 'language rejection'
                        : 'AI rejection'}{' '}
                      of{' '}
                      {continuationContext.rejectedUrl ?? 'the previous Amazon candidate'}.
                    </p>
                  ) : null}
                  {step.retryOf ? (
                    <p className='text-xs text-muted-foreground'>Retry of: {step.retryOf}</p>
                  ) : null}
                  {step.candidateId ? (
                    <p className='text-xs text-muted-foreground'>Candidate: {step.candidateId}</p>
                  ) : null}
                  {stepDetails.length > 0 ? (
                    <dl className='grid gap-2 sm:grid-cols-2'>
                      {stepDetails.map((detail, detailIndex) => (
                        <div
                          key={`${step.key}-${step.attempt ?? 1}-detail-${detailIndex}`}
                          className='rounded-md border border-border/40 bg-muted/20 px-2 py-1.5'
                        >
                          <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                            {detail.label}
                          </dt>
                          <dd className='mt-0.5 text-sm'>{detail.value ?? 'Not available'}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {step.url ? (
                    <a
                      href={step.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                    >
                      Open Step URL
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  ) : null}
                  {timing ? <p className='text-xs text-muted-foreground'>{timing}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
