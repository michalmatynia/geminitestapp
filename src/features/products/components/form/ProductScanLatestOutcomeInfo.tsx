'use client';

import React from 'react';
import type { resolveProductScanLatestOutcomeSummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanLatestOutcomeInfoProps = {
  summary: ReturnType<typeof resolveProductScanLatestOutcomeSummary>;
};

function LatestOutcomeBadges({ summary }: { summary: NonNullable<ReturnType<typeof resolveProductScanLatestOutcomeSummary>> }): React.JSX.Element {
  const { resultCodeLabel, attempt, inputSource } = summary;
  return (
    <>
      {typeof resultCodeLabel === 'string' && resultCodeLabel !== '' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{resultCodeLabel}</span>
      ) : null}
      {typeof attempt === 'number' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>Attempt {attempt}</span>
      ) : null}
      {typeof inputSource === 'string' && inputSource !== '' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{inputSource === 'url' ? 'URL input' : 'File input'}</span>
      ) : null}
    </>
  );
}

export function ProductScanLatestOutcomeInfo({ summary }: ProductScanLatestOutcomeInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-destructive/20 px-2 py-0.5 font-medium text-destructive'>Failure source</span>
        <span className='text-muted-foreground'>{summary.phaseLabel}</span>
        <span className='font-medium text-foreground'>{summary.stepLabel}</span>
        <LatestOutcomeBadges summary={summary} />
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
