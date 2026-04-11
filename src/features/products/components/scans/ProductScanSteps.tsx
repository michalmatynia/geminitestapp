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
  product: 'Product Update',
};

const STEP_GROUP_ORDER: Record<NonNullable<ProductScanStep['group']>, number> = {
  input: 0,
  google_lens: 1,
  amazon: 2,
  product: 3,
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
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  inputSource: ProductScanStep['inputSource'];
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

export const resolveProductScanLatestOutcomeSummary = (
  steps: ProductScanStep[],
  options?: { allowStalled?: boolean }
): ProductScanLatestOutcomeSummary | null => {
  const failedStep = [...steps].reverse().find((step) => step.status === 'failed') ?? null;

  if (failedStep) {
    return {
      kind: 'failed',
      phaseLabel: STEP_GROUP_LABELS[resolveStepGroup(failedStep)],
      stepLabel: failedStep.label,
      message: failedStep.message ?? failedStep.warning ?? null,
      resultCodeLabel: formatResultCode(failedStep.resultCode),
      attempt: failedStep.attempt ?? null,
      inputSource: failedStep.inputSource ?? null,
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
    stepLabel: stalledStep.label,
    message: stalledStep.message ?? stalledStep.warning ?? null,
    resultCodeLabel: formatResultCode(stalledStep.resultCode),
    attempt: stalledStep.attempt ?? null,
    inputSource: stalledStep.inputSource ?? null,
  };
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
                  </div>
                  {step.message ? <p className='text-sm text-muted-foreground'>{step.message}</p> : null}
                  {step.warning ? (
                    <p className='text-xs font-medium text-amber-300'>{step.warning}</p>
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
