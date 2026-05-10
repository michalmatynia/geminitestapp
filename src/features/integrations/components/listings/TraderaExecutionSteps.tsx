import React from 'react';

import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

const statusLabel = (status: TraderaExecutionStep['status']): string => {
  switch (status) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Failed';
    case 'running':
      return 'Running';
    case 'skipped':
      return 'Skipped';
    case 'pending':
    default:
      return 'Pending';
  }
};

type TraderaExecutionStepsProps = {
  title?: string;
  steps: TraderaExecutionStep[];
  compact?: boolean;
  live?: boolean;
  liveStatus?: 'queued' | 'running' | null;
};

const isResolvedStep = (step: TraderaExecutionStep): boolean =>
  step.status === 'success' || step.status === 'skipped' || step.status === 'error';

const resolveCurrentStepSummary = (
  steps: TraderaExecutionStep[],
  liveStatus: 'queued' | 'running' | null
): string => {
  if (liveStatus === 'queued') {
    return 'Waiting for worker to start.';
  }

  const runningStep = steps.find((step) => step.status === 'running');
  if (runningStep) {
    return `Now: ${runningStep.label}`;
  }

  const errorStep = steps.find((step) => step.status === 'error');
  if (errorStep) {
    return `Stopped at: ${errorStep.label}`;
  }

  const resolvedCount = steps.filter(isResolvedStep).length;
  if (resolvedCount === steps.length) {
    return 'All steps complete.';
  }

  const nextStep = steps.find((step) => step.status === 'pending');
  if (nextStep) {
    return `Next: ${nextStep.label}`;
  }

  return `${resolvedCount}/${steps.length} steps updated.`;
};

export function TraderaExecutionSteps(
  props: TraderaExecutionStepsProps
): React.JSX.Element | null {
  const { title = 'Execution steps', steps, compact = false, live = false, liveStatus = null } =
    props;

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const resolvedCount = steps.filter(isResolvedStep).length;
  const progressPercent = Math.round((resolvedCount / steps.length) * 100);
  const currentStepSummary = resolveCurrentStepSummary(steps, liveStatus);

  return (
    <div className='rounded-lg border border-white/10 bg-white/5 p-3'>
      <div className='mb-3 space-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400'>
            {title}
          </div>
          {live ? (
            <StatusBadge
              status={liveStatus === 'queued' ? 'pending' : 'running'}
              label={liveStatus === 'queued' ? 'Live queued' : 'Live'}
              size='sm'
            />
          ) : null}
          <div className='ml-auto text-[11px] font-medium text-gray-400'>
            {resolvedCount}/{steps.length}
          </div>
        </div>
        <div className='text-xs font-medium text-gray-200'>{currentStepSummary}</div>
        <div className='h-1.5 overflow-hidden rounded-full bg-white/10'>
          <div
            className='h-full rounded-full bg-cyan-400/70 transition-all duration-300'
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <div className='space-y-2'>
        {steps.map((step: TraderaExecutionStep, index: number) => (
          <div
            key={`${step.id}-${index}`}
            className={cn(
              'flex items-start gap-3 rounded-md border border-white/6 bg-black/10 px-3 py-2 transition-colors',
              step.status === 'running' &&
                'border-cyan-300/40 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.16)]'
            )}
          >
            <div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-gray-300'>
              {index + 1}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span
                  className={
                    compact
                      ? 'rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[10px] text-gray-400'
                      : 'rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[11px] text-gray-400'
                  }
                >
                  {step.id}
                </span>
                <span className={compact ? 'text-xs text-white' : 'text-sm text-white'}>
                  {step.label}
                </span>
                <StatusBadge
                  status={step.status}
                  label={statusLabel(step.status)}
                  size='sm'
                />
              </div>
              {step.message ? (
                <p
                  className={
                    compact
                      ? 'mt-1 text-[11px] leading-5 text-gray-400 break-words'
                      : 'mt-1 text-xs leading-5 text-gray-400 break-words'
                  }
                >
                  {step.message}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
