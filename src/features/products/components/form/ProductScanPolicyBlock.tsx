'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  buildProductScan1688SectionId,
  resolveProductScan1688ApplyPolicySummary,
} from '@/features/products/components/scans/ProductScan1688Details';
import { formatTimestamp } from './ProductFormScans.helpers';

type ProductScanPolicyBlockProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  clearBlockedScanReviewed: (scanId: string | null | undefined) => void;
};

function PolicyVerificationLinks({ scanId, canShow }: { scanId: string, canShow: boolean }): React.JSX.Element | null {
  if (!canShow) return null;
  const urlsHref = buildProductScan1688SectionId(scanId, 'candidate-urls');
  const matchHref = buildProductScan1688SectionId(scanId, 'match-evaluation');

  return (
    <>
      <a href={urlsHref} className='inline-flex items-center gap-1 text-[11px] text-primary hover:underline'>
        Verify Candidate URLs
        <ExternalLink className='h-3 w-3' />
      </a>
      <a href={matchHref} className='inline-flex items-center gap-1 text-[11px] text-primary hover:underline'>
        Verify Match Evaluation
        <ExternalLink className='h-3 w-3' />
      </a>
    </>
  );
}

export function ProductScanPolicyBlock({
  scan,
  isAmazonScan,
  isBlockedScanReviewed,
  markBlockedScanReviewed,
  clearBlockedScanReviewed,
}: ProductScanPolicyBlockProps): React.JSX.Element | null {
  if (isAmazonScan === true) return null;

  const summary = resolveProductScan1688ApplyPolicySummary(scan);
  if (summary.isBlocked === false) return null;

  const isReviewed = summary.blockActions === true && isBlockedScanReviewed(scan.id);

  return (
    <div className='space-y-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
      <p className='text-xs font-medium text-amber-300'>Apply is blocked by policy: {summary.reason}</p>
      {isReviewed === true ? (
        <p className='text-[11px] text-muted-foreground'>Review bypass active (reviewed at {formatTimestamp(scan.updatedAt)})</p>
      ) : (
        <div className='flex flex-wrap gap-3'>
          <PolicyVerificationLinks scanId={scan.id} canShow={summary.blockActions === true} />
          {summary.blockActions === true ? (
            <button type='button' onClick={() => markBlockedScanReviewed(scan.id)} className='text-primary underline-offset-2 hover:underline text-[11px]'>
              Mark reviewed
            </button>
          ) : null}
        </div>
      )}
      {isReviewed === true && summary.blockActions === true ? (
         <button type='button' onClick={() => clearBlockedScanReviewed(scan.id)} className='text-primary underline-offset-2 hover:underline text-[11px]'>
            Undo review
         </button>
      ) : null}
    </div>
  );
}
