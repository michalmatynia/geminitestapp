'use client';

import React from 'react';
import type { resolveProductScanRejectedCandidateSummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanRejectedCandidateInfoProps = {
  summary: ReturnType<typeof resolveProductScanRejectedCandidateSummary>;
};

export function ProductScanRejectedCandidateInfo({ summary }: ProductScanRejectedCandidateInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
        {summary.rejectedCount} candidate{summary.rejectedCount === 1 ? '' : 's'} rejected before match
      </span>
      {summary.languageRejectedCount > 0 ? (
        <span className='text-muted-foreground'>
          ({summary.languageRejectedCount} non-English)
        </span>
      ) : null}
      {typeof summary.latestReason === 'string' && summary.latestReason !== '' ? (
        <span className='text-muted-foreground'>
          Latest reason: {summary.latestReason}
        </span>
      ) : null}
    </div>
  );
}
