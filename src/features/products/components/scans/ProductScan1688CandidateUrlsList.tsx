'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';
import { CopyButton } from '@/shared/ui/copy-button';
import { buildProductScan1688SectionId } from './ProductScan1688Details.helpers';

type ProductScan1688CandidateUrlsListProps = {
  scanId: string | null;
  urls: string[];
};

export function ProductScan1688CandidateUrlsList({ scanId, urls }: ProductScan1688CandidateUrlsListProps): React.JSX.Element | null {
  if (urls.length === 0) return null;

  return (
    <div id={buildProductScan1688SectionId(scanId, 'candidate-urls') ?? undefined} className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Candidate supplier URLs</p>
      <ul className='space-y-2 text-sm text-foreground'>
        {urls.map((url, i) => (
          <li key={`${url}-${i}`} className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <span className='font-medium'>Candidate {i + 1}</span>
              <a href={url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'>
                Open <ExternalLink className='h-3.5 w-3.5' />
              </a>
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <span className='break-all'>{url}</span>
              <CopyButton value={url} className='h-6 px-2 text-[11px]' />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
