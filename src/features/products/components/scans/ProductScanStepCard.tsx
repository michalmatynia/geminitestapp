import { ExternalLink } from 'lucide-react';
import React from 'react';

import type { ProductScanStep } from '@/shared/contracts/product-scans';

import {
  isAmazonCandidateContinuationStep,
  resolveAmazonEvaluationRejectionKind,
} from './ProductScanSteps.continuation';
import {
  resolveEvaluationExecutionSummary,
  resolveProductScanEvaluationPolicySummaryFromStep,
} from './ProductScanSteps.evaluation';
import type {
  ProductScanContinuationContext,
  ProductScanEvaluationPolicySummary,
} from './ProductScanSteps.types';
import {
  STEP_STATUS_CLASSES,
  STEP_STATUS_LABELS,
  formatResultCode,
  formatStepTiming,
  resolveStepAttempt,
  resolveStepGroup,
} from './ProductScanSteps.utils';

type StepBadge = {
  key: string;
  label: string;
  className: string;
};

const MUTED_BADGE_CLASS =
  'inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground';
const RECOVERY_BADGE_CLASS =
  'inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300';

const createStatusBadge = (step: ProductScanStep): StepBadge => ({
  key: 'status',
  label: STEP_STATUS_LABELS[step.status],
  className: `inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STEP_STATUS_CLASSES[step.status]}`,
});

const buildBasicStepBadges = (step: ProductScanStep): StepBadge[] => {
  const attemptValue = resolveStepAttempt(step);
  return [
    createStatusBadge(step),
    attemptValue !== null
      ? { key: 'attempt', label: `Attempt ${attemptValue}`, className: MUTED_BADGE_CLASS }
      : null,
    typeof step.candidateRank === 'number'
      ? {
          key: 'candidate-rank',
          label: `Candidate #${step.candidateRank}`,
          className: MUTED_BADGE_CLASS,
        }
      : null,
    step.inputSource !== null
      ? {
          key: 'input-source',
          label: step.inputSource === 'url' ? 'URL input' : 'File input',
          className: MUTED_BADGE_CLASS,
        }
      : null,
  ].filter((badge): badge is StepBadge => badge !== null);
};

const buildEvaluationBadges = (step: ProductScanStep): StepBadge[] => {
  const resultCodeLabel = formatResultCode(step.resultCode);
  const executionSummary = resolveEvaluationExecutionSummary(step);
  return [
    resultCodeLabel !== null
      ? { key: 'result-code', label: resultCodeLabel, className: MUTED_BADGE_CLASS }
      : null,
    step.key === 'amazon_ai_evaluate' && resolveAmazonEvaluationRejectionKind(step) === 'language'
      ? { key: 'language-gate', label: 'Language gate', className: RECOVERY_BADGE_CLASS }
      : null,
    executionSummary !== null
      ? { key: 'execution', label: executionSummary.badgeLabel, className: MUTED_BADGE_CLASS }
      : null,
  ].filter((badge): badge is StepBadge => badge !== null);
};

const resolveQueueContinuationBadge = (
  step: ProductScanStep,
  continuationContext: ProductScanContinuationContext
): StepBadge | null => {
  const isQueueStep =
    continuationContext.step === step &&
    isAmazonCandidateContinuationStep(step) &&
    step.label === 'Continue with next Amazon candidate';
  if (!isQueueStep) return null;
  return {
    key: 'queue-continuation',
    label:
      continuationContext.rejectionKind === 'language'
        ? 'Language rejection recovery'
        : 'AI rejection recovery',
    className: RECOVERY_BADGE_CLASS,
  };
};

const resolveAmazonContinuationBadge = (
  step: ProductScanStep,
  continuationContext: ProductScanContinuationContext
): StepBadge | null => {
  if (resolveStepGroup(step) !== 'amazon' || continuationContext.step === step) return null;
  return {
    key: 'amazon-continuation',
    label:
      continuationContext.rejectionKind === 'language'
        ? 'Language recovery attempt'
        : 'Recovery attempt',
    className: RECOVERY_BADGE_CLASS,
  };
};

const buildContinuationBadges = (
  step: ProductScanStep,
  continuationContext: ProductScanContinuationContext | null
): StepBadge[] => {
  if (continuationContext === null) return [];
  return [
    resolveQueueContinuationBadge(step, continuationContext),
    resolveAmazonContinuationBadge(step, continuationContext),
  ].filter((badge): badge is StepBadge => badge !== null);
};

function StepBadgeList(props: { badges: StepBadge[] }): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {props.badges.map((badge) => (
        <span key={badge.key} className={badge.className}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

function ProductScanEvaluationPolicyPanel(props: {
  summary: ProductScanEvaluationPolicySummary;
}): React.JSX.Element {
  const badges = [
    props.summary.modelSource,
    props.summary.thresholdLabel,
    props.summary.scopeLabel,
    props.summary.similarityDecisionLabel,
    props.summary.languageGateLabel,
    props.summary.languageDetectionLabel,
  ].filter((badge): badge is string => badge !== null);
  return (
    <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          AI evaluator policy
        </span>
        {badges.map((badge) => (
          <span
            key={badge}
            className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'
          >
            {badge}
          </span>
        ))}
      </div>
      {props.summary.modelLabel !== null ? (
        <p className='text-xs text-muted-foreground'>Model {props.summary.modelLabel}</p>
      ) : null}
    </div>
  );
}

function ProductScanStepDetails(props: { step: ProductScanStep }): React.JSX.Element | null {
  const details = Array.isArray(props.step.details) ? props.step.details : [];
  if (details.length === 0) return null;
  return (
    <dl className='grid gap-2 sm:grid-cols-2'>
      {details.map((detail, detailIndex) => (
        <div
          key={`${props.step.key}-${props.step.attempt ?? 1}-detail-${detailIndex}`}
          className='rounded-md border border-border/40 bg-muted/20 px-2 py-1.5'
        >
          <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            {detail.label}
          </dt>
          <dd className='mt-0.5 text-sm'>{detail.value ?? 'Not available'}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProductScanStepMessages(props: { step: ProductScanStep }): React.JSX.Element {
  return (
    <>
      {typeof props.step.message === 'string' ? (
        <p className='text-sm text-muted-foreground'>{props.step.message}</p>
      ) : null}
      {typeof props.step.warning === 'string' ? (
        <p className='text-xs font-medium text-amber-300'>{props.step.warning}</p>
      ) : null}
    </>
  );
}

function ProductScanContinuationNote(props: {
  step: ProductScanStep;
  continuationContext: ProductScanContinuationContext | null;
}): React.JSX.Element | null {
  const { continuationContext, step } = props;
  if (continuationContext === null) return null;
  if (resolveStepGroup(step) !== 'amazon' || continuationContext.step === step) return null;
  return (
    <p className='text-xs text-muted-foreground'>
      Continues after{' '}
      {continuationContext.rejectionKind === 'language' ? 'language rejection' : 'AI rejection'}{' '}
      of {continuationContext.rejectedUrl ?? 'the previous Amazon candidate'}.
    </p>
  );
}

function ProductScanStepLink(props: { step: ProductScanStep }): React.JSX.Element | null {
  if (typeof props.step.url !== 'string') return null;
  return (
    <a
      href={props.step.url}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
    >
      Open Step URL
      <ExternalLink className='h-3.5 w-3.5' />
    </a>
  );
}

export function ProductScanStepCard(props: {
  step: ProductScanStep;
  continuationContext: ProductScanContinuationContext | null;
}): React.JSX.Element {
  const { continuationContext, step } = props;
  const timing = formatStepTiming(step);
  const evaluationPolicySummary = resolveProductScanEvaluationPolicySummaryFromStep(step);
  const evaluationExecutionSummary = resolveEvaluationExecutionSummary(step);
  const badges = [
    ...buildBasicStepBadges(step),
    ...buildEvaluationBadges(step),
    ...buildContinuationBadges(step, continuationContext),
  ];

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium'>{step.label}</span>
        <StepBadgeList badges={badges} />
      </div>
      <ProductScanStepMessages step={step} />
      {typeof evaluationExecutionSummary?.detailLabel === 'string' ? (
        <p className='text-xs text-muted-foreground'>{evaluationExecutionSummary.detailLabel}</p>
      ) : null}
      {evaluationPolicySummary !== null ? (
        <ProductScanEvaluationPolicyPanel summary={evaluationPolicySummary} />
      ) : null}
      <ProductScanContinuationNote step={step} continuationContext={continuationContext} />
      {typeof step.retryOf === 'string' ? (
        <p className='text-xs text-muted-foreground'>Retry of: {step.retryOf}</p>
      ) : null}
      {typeof step.candidateId === 'string' ? (
        <p className='text-xs text-muted-foreground'>Candidate: {step.candidateId}</p>
      ) : null}
      <ProductScanStepDetails step={step} />
      <ProductScanStepLink step={step} />
      {timing !== null ? <p className='text-xs text-muted-foreground'>{timing}</p> : null}
    </div>
  );
}
