'use client';

import React from 'react';
import type { resolveProductScanLatestOutcomeSummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanLatestOutcomeInfoProps = {
  summary: ReturnType<typeof resolveProductScanLatestOutcomeSummary>;
};

export function ProductScanLatestOutcomeInfo({ summary }: ProductScanLatestOutcomeInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-destructive/20 px-2 py-0.5 font-medium text-destructive'>
          Failure source
        </span>
        <span className='text-muted-foreground'>{summary.phaseLabel}</span>
        <span className='font-medium text-foreground'>{summary.stepLabel}</span>
        {typeof summary.resultCodeLabel === 'string' && summary.resultCodeLabel !== '' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.resultCodeLabel}
          </span>
        ) : null}
        {typeof summary.attempt === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            Attempt {summary.attempt}
          </span>
        ) : null}
        {typeof summary.inputSource === 'string' && summary.inputSource !== '' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.inputSource === 'url' ? 'URL input' : 'File input'}
          </span>
        ) : null}
      </div>
      {typeof summary.message === 'string' && summary.message !== '' ? (
        <p className='text-sm text-muted-foreground'>{summary.message}</p>
      ) : null}
      {typeof summary.timingLabel === 'string' && summary.timingLabel !== '' ? (
        <p className='text-xs text-muted-foreground'>{summary.timingLabel}</p>
      ) : null}
    </div>
  );
}
