'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { resolveProductScan1688QualitySummary } from './ProductScan1688Details.helpers';

type ProductScan1688QualitySummaryProps = {
  scan: Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'>;
};

function getPrimaryClassName(label: string): string {
  if (label === 'AI-approved supplier match') return 'border-emerald-500/40 text-emerald-300';
  if (label === 'Deterministic supplier match') return 'border-cyan-500/40 text-cyan-300';
  if (label === 'Heuristic supplier match') return 'border-amber-500/40 text-amber-300';
  return 'border-border/60 text-muted-foreground';
}

export function ProductScan1688QualitySummary({ scan }: ProductScan1688QualitySummaryProps): React.JSX.Element | null {
  const quality = resolveProductScan1688QualitySummary(scan);
  if (quality === null) return null;

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Supplier result</p>
      <div className='flex flex-wrap gap-2'>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getPrimaryClassName(quality.primaryLabel)}`}>
          {quality.primaryLabel}
        </span>
        {quality.hasPricing && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>Pricing extracted</span>}
        {quality.hasImages && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>Images extracted</span>}
        {quality.hasStoreLink && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>Store link found</span>}
      </div>
    </div>
  );
}
