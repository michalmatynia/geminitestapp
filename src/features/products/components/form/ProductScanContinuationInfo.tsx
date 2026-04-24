'use client';

import React from 'react';
import type { resolveProductScanContinuationSummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanContinuationInfoProps = {
  summary: ReturnType<typeof resolveProductScanContinuationSummary>;
};

export function ProductScanContinuationInfo({ summary }: ProductScanContinuationInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
          {summary.badgeLabel}
        </span>
        {typeof summary.contextLabel === 'string' && summary.contextLabel !== '' ? (
          <span className='text-muted-foreground'>{summary.contextLabel}</span>
        ) : null}
        <span className='font-medium text-foreground'>{summary.stepLabel}</span>
        {typeof summary.resultCodeLabel === 'string' && summary.resultCodeLabel !== '' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.resultCodeLabel}
          </span>
        ) : null}
      </div>
      {typeof summary.message === 'string' && summary.message !== '' ? (
        <p className='text-sm text-muted-foreground'>{summary.message}</p>
      ) : null}
    </div>
  );
}
