

import { ExternalLink } from 'lucide-react';
import React from 'react';

import type { ProductScanStep } from '@/shared/contracts/product-scans';
import {
  PRODUCT_SCAN_STEP_GROUP_LABELS as STEP_GROUP_LABELS,
  PRODUCT_SCAN_STEP_GROUP_ORDER as STEP_GROUP_ORDER,
} from '@/shared/lib/browser-execution';

type StepStatus = NonNullable<ProductScanStep['status']>;

const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Skipped',
};

const STEP_STATUS_CLASSES: Record<StepStatus, string> = {
  pending: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  failed: 'border-destructive/40 text-destructive',
  skipped: 'border-amber-500/40 text-amber-300',
};

const resolveStepGroup = (
  step: Pick<ProductScanStep, 'group' | 'key'>
): NonNullable<ProductScanStep['group']> => {
  const stepGroup = step.group;
  if (stepGroup !== undefined && stepGroup !== null) {
    return stepGroup;
  }

  if (step.key === 'init_scan' || step.key === 'queue_scan') {
    return 'input';
  }

  if (step.key === 'google_upload' || step.key === 'google_candidates' || step.key === 'google_captcha') {
    return 'google_lens';
  }

  if (step.key.startsWith('amazon_') === true) {
    return 'amazon';
  }

  if (step.key.startsWith('1688_') === true || step.key.startsWith('supplier_') === true) {
    return 'supplier';
  }

  return 'product';
};

const getStepGroupLabel = (group: NonNullable<ProductScanStep['group']>): string => {
  const label = (STEP_GROUP_LABELS as Record<string, string>)[group];
  return typeof label === 'string' ? label : 'Scan';
};

const getStepGroupOrder = (group: NonNullable<ProductScanStep['group']>): number => {
  const order = (STEP_GROUP_ORDER as Record<string, number>)[group];
  return typeof order === 'number' ? order : 999;
};

export type ProductScanActiveStepSummary = {
  phaseLabel: string;
  stepLabel: string;
  message: string | null;
  attempt: number | null;
  inputSource: string | null;
};

export type ProductScanLatestOutcomeSummary = {
  kind: 'failed' | 'stalled';
  phaseLabel: string;
  sourceLabel: string | null;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  inputSource: string | null;
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
  executionLabel: string | null;
  modelSource: string | null;
  modelLabel: string | null;
  thresholdLabel: string | null;
  scopeLabel: string | null;
  similarityDecisionLabel: string | null;
  languageGateLabel: string | null;
  languageDetectionLabel: string | null;
};

type AmazonEvaluationExecutionSummary = {
  badgeLabel: string;
  detailLabel: string | null;
};

const resolveStepDetailValue = (
  step: Pick<ProductScanStep, 'details'>,
  label: string
): string | null => {
  const detail = step.details.find((entry) => entry.label === label);
  const value = detail?.value;
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return null;
};

export const resolveProductScanActiveStepSummary = (
  steps: ProductScanStep[]
): ProductScanActiveStepSummary | null => {
  const activeStep =
    [...steps].reverse().find((step) => step.status === 'running' || step.status === 'pending') ?? null;

  if (activeStep === null) {
    return null;
  }

  const message = activeStep.message ?? activeStep.warning;
  const group = resolveStepGroup(activeStep);

  return {
    phaseLabel: getStepGroupLabel(group),
    stepLabel: activeStep.label,
    message: typeof message === 'string' && message.trim() !== '' ? message.trim() : null,
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
    if (step.key === 'amazon_ai_triage') {
      return 'Amazon triage';
    }

    if (step.key === 'amazon_ai_evaluate') {
      return 'Amazon evaluator';
    }

    if (step.key === 'amazon_open' || step.key === 'amazon_overlays' || step.key === 'amazon_content_ready') {
      return 'Amazon page';
    }

    if (step.key === 'amazon_extract') {
      return 'Amazon extraction';
    }

    return 'Amazon page';
  }

  if (group === 'supplier') {
    if (
      step.key === '1688_open' ||
      step.key === '1688_upload' ||
      step.key === '1688_collect_candidates'
    ) {
      return 'Supplier search';
    }

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

const formatResultCode = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value === '') return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) === true) return value;
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
  const startedAt = typeof step.startedAt === 'string' && step.startedAt !== '' ? formatTimestamp(step.startedAt) : null;
  const completedAt = typeof step.completedAt === 'string' && step.completedAt !== '' ? formatTimestamp(step.completedAt) : null;
  const duration = formatDuration(step.durationMs);

  if (startedAt !== null && completedAt !== null && duration !== null) {
    return `Started ${startedAt} · Completed ${completedAt} · Duration ${duration}`;
  }

  if (startedAt !== null && completedAt !== null) {
    return `Started ${startedAt} · Completed ${completedAt}`;
  }

  if (startedAt !== null && duration !== null) {
    return `Started ${startedAt} · Duration ${duration}`;
  }

  if (startedAt !== null) {
    return `Started ${startedAt}`;
  }

  if (completedAt !== null && duration !== null) {
    return `Completed ${completedAt} · Duration ${duration}`;
  }

  if (completedAt !== null) {
    return `Completed ${completedAt}`;
  }

  return null;
};

export const resolveProductScanLatestOutcomeSummary = (
  steps: ProductScanStep[],
  options?: { allowStalled?: boolean }
): ProductScanLatestOutcomeSummary | null => {
  const failedStep = [...steps].reverse().find((step) => step.status === 'failed') ?? null;

  if (failedStep !== null) {
    const message = failedStep.message ?? failedStep.warning;
    const group = resolveStepGroup(failedStep);
    return {
      kind: 'failed',
      phaseLabel: getStepGroupLabel(group),
      sourceLabel: resolveProductScanFailureSourceLabel(failedStep),
      stepLabel: failedStep.label,
      message: typeof message === 'string' && message.trim() !== '' ? message.trim() : null,
      resultCodeLabel: formatResultCode(failedStep.resultCode),
      attempt: failedStep.attempt ?? null,
      inputSource: failedStep.inputSource ?? null,
      url: typeof failedStep.url === 'string' && failedStep.url !== '' ? failedStep.url : null,
      timingLabel: formatStepTiming(failedStep),
    };
  }

  if (options?.allowStalled !== true) {
    return null;
  }

  const stalledStep =
    [...steps].reverse().find((step) => step.status === 'completed' || step.status === 'skipped') ?? null;

  if (stalledStep === null) {
    return null;
  }

  const message = stalledStep.message ?? stalledStep.warning;
  const group = resolveStepGroup(stalledStep);
  return {
    kind: 'stalled',
    phaseLabel: getStepGroupLabel(group),
    sourceLabel: resolveProductScanFailureSourceLabel(stalledStep),
    stepLabel: stalledStep.label,
    message: typeof message === 'string' && message.trim() !== '' ? message.trim() : null,
    resultCodeLabel: formatResultCode(stalledStep.resultCode),
    attempt: stalledStep.attempt ?? null,
    inputSource: stalledStep.inputSource ?? null,
    url: typeof stalledStep.url === 'string' && stalledStep.url !== '' ? stalledStep.url : null,
    timingLabel: formatStepTiming(stalledStep),
  };
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

  const rawRejectionKind = resolveStepDetailValue(step, 'Rejection kind');
  const rejectionKind = rawRejectionKind !== null ? rawRejectionKind.toLowerCase() : null;
  if (rejectionKind === null) {
    return null;
  }

  if (rejectionKind.includes('language') === true) {
    return 'language';
  }

  if (rejectionKind.includes('product') === true) {
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

const isAmazonCandidateContinuationStep = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message'>
): boolean => {
  if (step.key !== 'queue_scan') return false;
  if (step.label === 'Continue with next Amazon candidate') return true;
  const message = step.message;
  if (typeof message !== 'string') return false;
  return message.includes('next Amazon candidate after AI rejection') === true ||
    message.includes('next Amazon candidate after language rejection') === true;
};

const resolveAmazonCandidateContinuationRejectionKind = (
  step: Pick<ProductScanStep, 'key' | 'label' | 'message' | 'resultCode' | 'details'>
): 'language' | 'product' | null => {
  const explicitKind = resolveAmazonEvaluationRejectionKind(step);
  if (explicitKind !== null) {
    return explicitKind;
  }

  const message = step.message;
  if (typeof message === 'string' && message.includes('language rejection') === true) {
    return 'language';
  }

  return isAmazonCandidateContinuationStep(step) === true ? 'product' : null;
};

export const resolveProductScanContinuationSummary = (
  steps: ProductScanStep[]
): ProductScanContinuationSummary | null => {
  const continuationStep =
    [...steps]
      .reverse()
      .find(
        (step) => isAmazonCandidateContinuationStep(step)
      ) ?? null;

  if (continuationStep === null) {
    return null;
  }

  const group = resolveStepGroup(continuationStep);

  return {
    phaseLabel: getStepGroupLabel(group),
    stepLabel: continuationStep.label,
    message: typeof continuationStep.message === 'string' && continuationStep.message !== '' ? continuationStep.message : null,
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

  const reversedRejectedSteps = [...rejectedEvaluationSteps].reverse();
  const latestRejectedStep = reversedRejectedSteps[0] ?? null;
  if (latestRejectedStep === null) {
    return null;
  }

  const languageRejectedCount = rejectedEvaluationSteps.filter(
    (step) => resolveAmazonEvaluationRejectionKind(step) === 'language'
  ).length;
  const latestAmazonRejectionKind = resolveAmazonEvaluationRejectionKind(latestRejectedStep);
  const latestSupplierRejectionKind = resolveSupplierEvaluationRejectionKind(latestRejectedStep);

  const latestReason =
    resolveStepDetailValue(latestRejectedStep, 'Reason') ??
    resolveStepDetailValue(latestRejectedStep, 'Mismatch') ??
    resolveStepDetailValue(latestRejectedStep, 'Language reason') ??
    (typeof latestRejectedStep.message === 'string' && latestRejectedStep.message !== '' ? latestRejectedStep.message : null);

  const latestRejectedUrl = typeof latestRejectedStep.url === 'string' && latestRejectedStep.url !== ''
    ? latestRejectedStep.url
    : resolveStepDetailValue(latestRejectedStep, 'Candidate URL');

  return {
    rejectedCount: rejectedEvaluationSteps.length,
    languageRejectedCount,
    latestRejectedUrl,
    latestReason,
    latestRejectionKind: latestAmazonRejectionKind ?? latestSupplierRejectionKind,
  };
};

const resolveAmazonEvaluationExecutionSummary = (
  step: Pick<ProductScanStep, 'key' | 'resultCode' | 'status'>
): AmazonEvaluationExecutionSummary | null => {
  if (step.key !== 'amazon_ai_triage' && step.key !== 'amazon_ai_evaluate') {
    return null;
  }

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

const resolveProductScanEvaluationPolicySummaryFromStep = (
  step: Pick<ProductScanStep, 'key' | 'details' | 'resultCode' | 'status'> | null | undefined
): ProductScanEvaluationPolicySummary | null => {
  if (step === null || step === undefined) {
    return null;
  }

  if (
    step.key !== 'amazon_ai_triage' &&
    step.key !== 'amazon_ai_evaluate' &&
    step.key !== 'supplier_ai_evaluate'
  ) {
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
  if (allowedContentLanguage !== null && languagePolicy === 'Reject non-English content') {
    languageGateLabel = `${allowedContentLanguage} only`;
  } else if (allowedContentLanguage !== null && languagePolicy !== null) {
    languageGateLabel = `${allowedContentLanguage} · ${languagePolicy}`;
  } else {
    languageGateLabel = allowedContentLanguage ?? languagePolicy;
  }

  if (
    executionLabel === null &&
    modelSource === null &&
    modelLabel === null &&
    thresholdLabel === null &&
    scopeLabel === null &&
    similarityDecisionLabel === null &&
    languageGateLabel === null &&
    languageDetectionLabel === null
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

export const resolveProductScanEvaluationPolicySummary = (
  steps: ProductScanStep[]
): ProductScanEvaluationPolicySummary | null => {
  const evaluationStep = [...steps].reverse().find(
    (step) =>
      step.key === 'amazon_ai_triage' ||
      step.key === 'amazon_ai_evaluate' ||
      step.key === 'supplier_ai_evaluate'
  ) ?? null;
  return resolveProductScanEvaluationPolicySummaryFromStep(evaluationStep);
};

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
      isAmazonCandidateContinuationStep(step) === false ||
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

function ProductScanStepGroup(props: {
  group: NonNullable<ProductScanStep['group']>;
  steps: ProductScanStep[];
  continuationContexts: Map<number, ProductScanContinuationContext>;
}): React.JSX.Element {
  const { group, steps, continuationContexts } = props;
  const groupLabel = getStepGroupLabel(group);

  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {groupLabel}
      </h5>
      <div className='space-y-2 border-l border-border/50 pl-3'>
        {steps.map((step, index) => {
          const timing = formatStepTiming(step);
          const stepDetails = Array.isArray(step.details) ? step.details : [];
          const resultCodeLabel = formatResultCode(step.resultCode);
          const attemptValue =
            typeof step.attempt === 'number' && Number.isFinite(step.attempt)
              ? step.attempt
              : null;
          const continuationContext =
            attemptValue !== null ? continuationContexts.get(attemptValue) ?? null : null;
          const evaluationPolicySummary = resolveProductScanEvaluationPolicySummaryFromStep(step);
          const evaluationExecutionSummary = resolveEvaluationExecutionSummary(step);
          const isContinuationQueueStep =
            continuationContext?.step === step &&
            step.key === 'queue_scan' &&
            step.label === 'Continue with next Amazon candidate';
          const isContinuationAmazonStep =
            resolveStepGroup(step) === 'amazon' &&
            continuationContext !== null &&
            continuationContext.step !== step;
          const stepLabel = step.label;
          const statusLabel = STEP_STATUS_LABELS[step.status];
          const statusClass = STEP_STATUS_CLASSES[step.status];
          const inputSourceLabel = step.inputSource === 'url' ? 'URL input' : 'File input';

          return (
            <div
              key={`${step.key}-${step.attempt ?? 1}-${step.inputSource ?? 'none'}-${index}`}
              className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-sm font-medium'>{stepLabel}</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}
                >
                  {statusLabel}
                </span>
                {attemptValue !== null ? (
                  <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                    Attempt {attemptValue}
                  </span>
                ) : null}
                {typeof step.candidateRank === 'number' ? (
                  <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                    Candidate #{step.candidateRank}
                  </span>
                ) : null}
                {typeof step.inputSource === 'string' ? (
                  <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                    {inputSourceLabel}
                  </span>
                ) : null}
                {resultCodeLabel !== null ? (
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
                {evaluationExecutionSummary !== null ? (
                  <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                    {evaluationExecutionSummary.badgeLabel}
                  </span>
                ) : null}
                {isContinuationQueueStep === true ? (
                  <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                    {continuationContext?.rejectionKind === 'language'
                      ? 'Language rejection recovery'
                      : 'AI rejection recovery'}
                  </span>
                ) : null}
                {isContinuationAmazonStep === true ? (
                  <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                    {continuationContext?.rejectionKind === 'language'
                      ? 'Language recovery attempt'
                      : 'Recovery attempt'}
                  </span>
                ) : null}
              </div>
              {typeof step.message === 'string' ? <p className='text-sm text-muted-foreground'>{step.message}</p> : null}
              {typeof step.warning === 'string' ? (
                <p className='text-xs font-medium text-amber-300'>{step.warning}</p>
              ) : null}
              {typeof evaluationExecutionSummary?.detailLabel === 'string' ? (
                <p className='text-xs text-muted-foreground'>
                  {evaluationExecutionSummary.detailLabel}
                </p>
              ) : null}
              {evaluationPolicySummary !== null ? (
                <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'>
                  <div className='flex flex-wrap items-center gap-2 text-xs'>
                    <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                      AI evaluator policy
                    </span>
                    {evaluationPolicySummary.modelSource !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.modelSource}
                      </span>
                    ) : null}
                    {evaluationPolicySummary.thresholdLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.thresholdLabel}
                      </span>
                    ) : null}
                    {evaluationPolicySummary.scopeLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.scopeLabel}
                      </span>
                    ) : null}
                    {evaluationPolicySummary.similarityDecisionLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.similarityDecisionLabel}
                      </span>
                    ) : null}
                    {evaluationPolicySummary.languageGateLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.languageGateLabel}
                      </span>
                    ) : null}
                    {evaluationPolicySummary.languageDetectionLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        {evaluationPolicySummary.languageDetectionLabel}
                      </span>
                    ) : null}
                  </div>
                  {evaluationPolicySummary.modelLabel !== null ? (
                    <p className='text-xs text-muted-foreground'>
                      Model {evaluationPolicySummary.modelLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {isContinuationAmazonStep === true && continuationContext !== null ? (
                <p className='text-xs text-muted-foreground'>
                  Continues after{' '}
                  {continuationContext.rejectionKind === 'language'
                    ? 'language rejection'
                    : 'AI rejection'}{' '}
                  of{' '}
                  {continuationContext.rejectedUrl ?? 'the previous Amazon candidate'}.
                </p>
              ) : null}
              {typeof step.retryOf === 'string' ? (
                <p className='text-xs text-muted-foreground'>Retry of: {step.retryOf}</p>
              ) : null}
              {typeof step.candidateId === 'string' ? (
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
              {typeof step.url === 'string' ? (
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
              {timing !== null ? <p className='text-xs text-muted-foreground'>{timing}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductScanSteps(props: { steps: ProductScanStep[] }): React.JSX.Element {
  const { steps } = props;
  const groupedSteps = steps
    .reduce<Array<{
      group: NonNullable<ProductScanStep['group']>;
      steps: ProductScanStep[];
    }>>((groups, step) => {
      const group = resolveStepGroup(step);
      const existingGroup = groups.find((entry) => entry.group === group);
      if (existingGroup !== undefined) {
        existingGroup.steps.push(step);
        return groups;
      }
      return [...groups, { group, steps: [step] }];
    }, [])
    .sort((left, right) => {
      const leftOrder = getStepGroupOrder(left.group);
      const rightOrder = getStepGroupOrder(right.group);
      return leftOrder - rightOrder;
    });

  const warningCount = steps.filter((step) => typeof step.warning === 'string' && step.warning.trim() !== '').length;
  const failedCount = steps.filter((step) => step.status === 'failed').length;
  const retryCount = steps.filter((step) => typeof step.retryOf === 'string' && step.retryOf.trim() !== '').length;
  const amazonCandidateAttemptCount = new Set(
    steps
      .filter((step) => resolveStepGroup(step) === 'amazon' && typeof step.attempt === 'number' && Number.isFinite(step.attempt))
      .map((step) => step.attempt)
  ).size;
  const supplierCandidateAttemptCount = new Set(
    steps
      .filter(
        (step) => step.key === 'supplier_open' && typeof step.attempt === 'number' && Number.isFinite(step.attempt)
      )
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
        {supplierCandidateAttemptCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {supplierCandidateAttemptCount} supplier candidate
            {supplierCandidateAttemptCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {activeStepSummary !== null ? (
          <span className='inline-flex items-center rounded-md border border-blue-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-blue-300'>
            Active: {activeStepSummary.stepLabel}
          </span>
        ) : null}
      </div>
      {groupedSteps.map((group) => (
        <ProductScanStepGroup
          key={group.group}
          group={group.group}
          steps={group.steps}
          continuationContexts={continuationContexts}
        />
      ))}
    </div>
  );
}
