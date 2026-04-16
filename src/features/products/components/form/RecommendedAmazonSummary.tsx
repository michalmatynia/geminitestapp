'use client';

import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import React from 'react';

import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import {
  ProductScanAmazonQualitySummary,
  ProductScanAmazonProvenanceSummary,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import { Button } from '@/shared/ui/button';
import {
  resolveStatusLabel,
  resolveStatusClassName,
  formatTimestamp,
  renderScanMeta,
  resolveScanMessages,
} from './ProductFormScans.helpers';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductFormBindings } from './ProductFormScans.types';

type RecommendedAmazonSummaryProps = {
  scan: ProductScanRecord;
  isExtractedFieldsExpanded: boolean;
  onToggleExtractedFields: (scanId: string) => void;
  productFormBindings: ProductFormBindings;
};

function RecommendedAmazonHeader({ scan, isExtractedFieldsExpanded, onToggleExtractedFields }: {
  scan: ProductScanRecord;
  isExtractedFieldsExpanded: boolean;
  onToggleExtractedFields: (scanId: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4'>
      <div className='space-y-1'>
        <div className='flex items-center gap-2'>
          <h4 className='text-sm font-semibold tracking-tight'>Recommended Amazon Result</h4>
          <span className='inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-inset ring-emerald-500/20'>
            Auto-detected
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>Latest result with strongest product match confidence.</p>
      </div>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={() => onToggleExtractedFields(scan.id)} className='h-8 gap-2 text-xs font-medium'>
          {isExtractedFieldsExpanded ? <ChevronUp className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
          {isExtractedFieldsExpanded ? 'Hide data mapping' : 'Review & apply data'}
        </Button>
        {typeof scan.url === 'string' && scan.url !== '' ? (
          <Button variant='outline' size='sm' className='h-8 w-8 p-0' asChild>
            <a href={scan.url} target='_blank' rel='noopener noreferrer' title='Open on Amazon'>
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RecommendedAmazonScanDetails({ scan }: { scan: ProductScanRecord }): React.JSX.Element {
  const { infoMessage, errorMessage } = resolveScanMessages(scan);
  const statusClassName = resolveStatusClassName(scan);
  const statusLabel = resolveStatusLabel(scan);

  return (
    <div className='space-y-3 rounded-lg bg-muted/20 p-4'>
      <div className='flex items-start gap-4'>
        <div className='flex-1 space-y-1.5 min-w-0'>
          {typeof scan.title === 'string' && scan.title !== '' ? (
            <h5 className='line-clamp-2 text-sm font-medium leading-relaxed'>{scan.title}</h5>
          ) : null}
          {renderScanMeta(scan)}
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
            {statusLabel}
          </span>
          <span className='text-[10px] font-medium text-muted-foreground'>{formatTimestamp(scan.createdAt)}</span>
        </div>
      </div>
      {(typeof infoMessage === 'string' && infoMessage !== '') || (typeof errorMessage === 'string' && errorMessage !== '') ? (
        <div className={`rounded-md px-3 py-2 text-sm leading-relaxed ${typeof errorMessage === 'string' && errorMessage !== '' ? 'border border-destructive/20 bg-destructive/10 text-destructive-foreground' : 'border border-border/50 bg-background/50 text-muted-foreground'}`}>
          {errorMessage ?? infoMessage}
        </div>
      ) : null}
    </div>
  );
}

export function RecommendedAmazonSummary({
  scan,
  isExtractedFieldsExpanded,
  onToggleExtractedFields,
  productFormBindings,
}: RecommendedAmazonSummaryProps): React.JSX.Element | null {
  return (
    <section className='space-y-4 rounded-xl border border-border/80 bg-card/30 p-5 shadow-sm'>
      <RecommendedAmazonHeader
        scan={scan}
        isExtractedFieldsExpanded={isExtractedFieldsExpanded}
        onToggleExtractedFields={onToggleExtractedFields}
      />

      <div className='grid gap-4 sm:grid-cols-2'>
        <ProductScanAmazonQualitySummary scan={scan} />
        <ProductScanAmazonProvenanceSummary scan={scan} />
      </div>

      <RecommendedAmazonScanDetails scan={scan} />

      {isExtractedFieldsExpanded === true ? (
        <div className='space-y-4 pt-2'>
          <ProductScanAmazonExtractedFieldsPanel
            scan={scan}
            formBindings={productFormBindings}
          />
        </div>
      ) : null}
    </section>
  );
}
