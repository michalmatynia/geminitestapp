import React from 'react';

import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';
import { StatusBadge } from '@/shared/ui/data-display.public';

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
};

export function TraderaExecutionSteps(
  props: TraderaExecutionStepsProps
): React.JSX.Element | null {
  const { title = 'Execution steps', steps, compact = false } = props;

  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  return (
    <div className='rounded-lg border border-white/10 bg-white/5 p-3'>
      <div className='mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400'>
        {title}
      </div>
      <div className='space-y-2'>
        {steps.map((step: TraderaExecutionStep, index: number) => (
          <div
            key={`${step.id}-${index}`}
            className='flex items-start gap-3 rounded-md border border-white/6 bg-black/10 px-3 py-2'
          >
            <div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-gray-300'>
              {index + 1}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
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
