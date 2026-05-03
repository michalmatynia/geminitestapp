'use client';

import type { Dispatch, SetStateAction } from 'react';

import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import { resolveAmazonScanRecommendationReason } from '@/features/products/components/scans/ProductScanAmazonDetails';
import type { ProductScanAmazonFormBindings } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';

import {
  formatAmazonScanTimestamp,
  hasDisplayText,
  resolveScanQualityHintLabels,
  resolveScanSelectionLabel,
} from './ProductFormLatestAmazonExtraction.helpers';

export interface LatestAmazonExtractionViewModel {
  extractedAmazonScans: ProductScanRecord[];
  formBindings: ProductScanAmazonFormBindings | null;
  recommendedAmazonScan: ProductScanRecord | null;
  recommendedScanId: string | null;
  recommendedScanReason: string | null;
  selectedAmazonScan: ProductScanRecord;
  selectedScanQualityHints: string[];
  setSelectedScanId: Dispatch<SetStateAction<string | null>>;
}

function QualityHintList({
  labels,
  recommendedScanId,
  recommendedScanReason,
  selectedAmazonScan,
}: {
  labels: string[];
  recommendedScanId: string | null;
  recommendedScanReason: string | null;
  selectedAmazonScan: ProductScanRecord;
}): React.JSX.Element | null {
  if (labels.length === 0) return null;
  const isRecommended = selectedAmazonScan.id === recommendedScanId;

  return (
    <div className='mt-2 flex flex-wrap gap-2'>
      {isRecommended ? (
        <span className='inline-flex items-center rounded-md border border-emerald-500/40 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-emerald-300'>
          Recommended
        </span>
      ) : null}
      {isRecommended && hasDisplayText(recommendedScanReason) ? (
        <span className='inline-flex items-center rounded-md border border-emerald-500/20 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-emerald-200'>
          {recommendedScanReason}
        </span>
      ) : null}
      {labels.map((label) => (
        <span
          key={`selected-quality-${label}`}
          className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-medium'
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function RecommendedScanNotice({
  recommendedAmazonScan,
  recommendedScanReason,
  selectedAmazonScan,
}: {
  recommendedAmazonScan: ProductScanRecord | null;
  recommendedScanReason: string | null;
  selectedAmazonScan: ProductScanRecord;
}): React.JSX.Element | null {
  if (recommendedAmazonScan === null) return null;
  if (selectedAmazonScan.id === recommendedAmazonScan.id) return null;

  return (
    <div className='mt-2 rounded-md border border-emerald-500/20 bg-background/70 px-3 py-2 text-[11px] text-emerald-100'>
      <p className='font-medium text-emerald-200'>Recommended instead:</p>
      <p className='mt-1 truncate'>{resolveScanSelectionLabel(recommendedAmazonScan)}</p>
      {hasDisplayText(recommendedScanReason) ? (
        <p className='mt-1 text-emerald-200'>{recommendedScanReason}</p>
      ) : null}
    </div>
  );
}

function AmazonExtractionSummary({
  model,
}: {
  model: LatestAmazonExtractionViewModel;
}): React.JSX.Element {
  const { extractedAmazonScans, selectedAmazonScan } = model;

  return (
    <div className='rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground'>
      <p>
        {extractedAmazonScans.length > 1
          ? `Showing ${resolveScanSelectionLabel(selectedAmazonScan)}.`
          : `Latest extracted Amazon scan from ${formatAmazonScanTimestamp(selectedAmazonScan.updatedAt)}.`}
      </p>
      <QualityHintList
        labels={model.selectedScanQualityHints}
        recommendedScanId={model.recommendedScanId}
        recommendedScanReason={model.recommendedScanReason}
        selectedAmazonScan={selectedAmazonScan}
      />
      <RecommendedScanNotice
        recommendedAmazonScan={model.recommendedAmazonScan}
        recommendedScanReason={model.recommendedScanReason}
        selectedAmazonScan={selectedAmazonScan}
      />
    </div>
  );
}

function ScanSelectionButton({
  index,
  recommendedScanId,
  scan,
  selectedAmazonScan,
  setSelectedScanId,
}: {
  index: number;
  recommendedScanId: string | null;
  scan: ProductScanRecord;
  selectedAmazonScan: ProductScanRecord;
  setSelectedScanId: Dispatch<SetStateAction<string | null>>;
}): React.JSX.Element {
  const isSelected = scan.id === selectedAmazonScan.id;
  const qualityHintLabels = resolveScanQualityHintLabels(scan);
  const isRecommended = scan.id === recommendedScanId;
  const recommendedReason = isRecommended ? resolveAmazonScanRecommendationReason(scan) : null;

  return (
    <Button
      key={scan.id}
      type='button'
      variant={isSelected ? 'default' : 'outline'}
      size='sm'
      onClick={() => setSelectedScanId(scan.id)}
      className='h-auto min-h-8 max-w-full px-3 py-1.5 text-left text-[11px]'
      aria-label={`Show Amazon extraction ${index + 1}`}
    >
      <span className='block truncate'>{resolveScanSelectionLabel(scan)}</span>
      {isRecommended ? (
        <span className='mt-1 block truncate text-[10px] font-medium text-emerald-300'>
          Recommended
        </span>
      ) : null}
      {isRecommended && hasDisplayText(recommendedReason) ? (
        <span className='mt-1 block truncate text-[10px] text-emerald-200'>
          {recommendedReason}
        </span>
      ) : null}
      {qualityHintLabels.length > 0 ? (
        <span className='mt-1 block truncate text-[10px] opacity-80'>
          {qualityHintLabels.join(' · ')}
        </span>
      ) : null}
    </Button>
  );
}

function ScanSelectionList({
  model,
}: {
  model: LatestAmazonExtractionViewModel;
}): React.JSX.Element | null {
  if (model.extractedAmazonScans.length <= 1) return null;

  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Recent extracted scans
      </p>
      <div className='flex flex-wrap gap-2'>
        {model.extractedAmazonScans.map((scan, index) => (
          <ScanSelectionButton
            key={scan.id}
            index={index}
            recommendedScanId={model.recommendedScanId}
            scan={scan}
            selectedAmazonScan={model.selectedAmazonScan}
            setSelectedScanId={model.setSelectedScanId}
          />
        ))}
      </div>
    </div>
  );
}

export function LatestAmazonExtractionView({
  model,
}: {
  model: LatestAmazonExtractionViewModel;
}): React.JSX.Element {
  return (
    <FormSection title='Latest Amazon Extraction'>
      <div className='space-y-3'>
        <AmazonExtractionSummary model={model} />
        <ScanSelectionList model={model} />
        <ProductScanAmazonExtractedFieldsPanel
          scan={model.selectedAmazonScan}
          formBindings={model.formBindings}
        />
      </div>
    </FormSection>
  );
}
