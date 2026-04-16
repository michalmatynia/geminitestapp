'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import {
  formatProductScan1688ComparisonCountLabel,
  resolveProductScan1688ComparisonTargets,
  ProductScan1688Details,
  resolveProductScan1688RecommendationSignal,
  resolveProductScan1688ApplyPolicySummary,
} from '@/features/products/components/scans/ProductScan1688Details';
import { ProductScan1688ApplyPanel } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import { Button } from '@/shared/ui/button';
import { resolveScanMessages } from './ProductFormScans.helpers';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { Supplier1688FormBindings } from './ProductFormScans.types';

type Recommended1688SummaryProps = {
  scan: ProductScanRecord;
  preferredScans: ProductScanRecord[];
  isBlockedReviewed: boolean;
  supplier1688FormBindings: Supplier1688FormBindings;
};

function Recommended1688Header({ scan }: { scan: ProductScanRecord }): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4'>
      <div className='space-y-1'>
        <div className='flex items-center gap-2'>
          <h4 className='text-sm font-semibold tracking-tight'>Recommended 1688 Supplier</h4>
          <span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-inset ring-blue-500/20'>
            Top pick
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>Supplier result with best match criteria and pricing.</p>
      </div>
      <div className='flex items-center gap-2'>
        {typeof scan.url === 'string' && scan.url !== '' ? (
          <Button variant='outline' size='sm' className='h-8 gap-2 text-xs font-medium' asChild>
            <a href={scan.url} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='h-3.5 w-3.5' />
              Open Result
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Recommended1688ConfidenceInfo({ scan, preferredScans, isBlockedReviewed }: { scan: ProductScanRecord, preferredScans: ProductScanRecord[], isBlockedReviewed: boolean }): React.JSX.Element {
  const signal = resolveProductScan1688RecommendationSignal({ isPreferred: true });
  const policy = resolveProductScan1688ApplyPolicySummary(scan);
  const targets = resolveProductScan1688ComparisonTargets(preferredScans, scan.id);
  const countLabel = formatProductScan1688ComparisonCountLabel(targets.alternativeTargets.length);

  const policyClassName = ((): string => {
    if (isBlockedReviewed === true) return 'text-muted-foreground line-through';
    if (policy !== null && policy.tone === 'destructive') return 'text-destructive';
    return 'text-amber-400';
  })();

  const policyLabel = policy !== null ? policy.label : 'Manual review recommended';

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <div className='space-y-2 rounded-lg border border-border/50 bg-background/50 p-3'>
        <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Match Confidence</div>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-semibold text-blue-400'>{signal.badgeLabel}</span>
          {countLabel !== null ? <span className='text-[10px] text-muted-foreground'>(compared to {countLabel})</span> : null}
        </div>
      </div>
      <div className='space-y-2 rounded-lg border border-border/50 bg-background/50 p-3'>
        <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>Apply Policy</div>
        <div className='flex items-center gap-2'>
          <span className={`text-xs font-semibold ${policyClassName}`}>
            {policyLabel}
          </span>
          {isBlockedReviewed === true ? <span className='text-[10px] font-medium text-emerald-400'>(Reviewed)</span> : null}
        </div>
      </div>
    </div>
  );
}

export function Recommended1688Summary({
  scan,
  preferredScans,
  isBlockedReviewed,
  supplier1688FormBindings,
}: Recommended1688SummaryProps): React.JSX.Element | null {
  const { infoMessage, errorMessage } = resolveScanMessages(scan);

  return (
    <section className='space-y-4 rounded-xl border border-border/80 bg-card/30 p-5 shadow-sm'>
      <Recommended1688Header scan={scan} />
      <Recommended1688ConfidenceInfo scan={scan} preferredScans={preferredScans} isBlockedReviewed={isBlockedReviewed} />

      <div className='rounded-lg bg-muted/20 p-4'>
        <ProductScan1688Details scan={scan} scanId={scan.id} showRecommendationReason />
      </div>

      {(typeof infoMessage === 'string' && infoMessage !== '') || (typeof errorMessage === 'string' && errorMessage !== '') ? (
        <div className={`rounded-md px-3 py-2 text-sm ${typeof errorMessage === 'string' && errorMessage !== '' ? 'border border-destructive/20 bg-destructive/5 text-destructive-foreground' : 'border border-border/50 bg-background/50 text-muted-foreground'}`}>
          {errorMessage ?? infoMessage}
        </div>
      ) : null}

      <div className='border-t border-border/40 pt-4'>
        <ProductScan1688ApplyPanel scan={scan} formBindings={supplier1688FormBindings} />
      </div>
    </section>
  );
}
