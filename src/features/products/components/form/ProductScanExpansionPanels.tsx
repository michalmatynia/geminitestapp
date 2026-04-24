'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductScanAmazonCandidatePreview } from '@/features/products/lib/product-scan-amazon-candidates';
import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import { ProductScanAmazonCandidateSelectionPanel } from '@/features/products/components/scans/ProductScanAmazonCandidateSelectionPanel';
import { isProductScanAmazonCandidateSelectionReady } from '@/features/products/lib/product-scan-amazon-candidates';
import { ProductScanDiagnostics } from '@/features/products/components/scans/ProductScanDiagnostics';
import { ProductScanSteps } from '@/features/products/components/scans/ProductScanSteps';
import type { ProductFormBindings } from './ProductFormScans.types';

type ProductScanExpansionPanelsProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
  extractedFieldsExpanded: boolean;
  diagnosticsExpanded: boolean;
  isExpanded: boolean;
  productFormBindings: ProductFormBindings;
  onExtractAmazonCandidate: (
    scan: ProductScanRecord,
    candidate: ProductScanAmazonCandidatePreview
  ) => Promise<void>;
  extractingCandidateUrl: string | null;
};

export function ProductScanExpansionPanels({
  scan,
  isAmazonScan,
  extractedFieldsExpanded,
  diagnosticsExpanded,
  isExpanded,
  productFormBindings,
  onExtractAmazonCandidate,
  extractingCandidateUrl,
}: ProductScanExpansionPanelsProps): React.JSX.Element {
  const scanSteps = Array.isArray(scan.steps) ? scan.steps : [];
  const candidateSelectionReady =
    isAmazonScan === true && isProductScanAmazonCandidateSelectionReady(scan);

  return (
    <>
      {candidateSelectionReady ? (
        <div className='mt-3 space-y-3'>
          <ProductScanAmazonCandidateSelectionPanel
            scan={scan}
            extractingCandidateUrl={extractingCandidateUrl}
            onExtractCandidate={(candidate) => onExtractAmazonCandidate(scan, candidate)}
          />
        </div>
      ) : null}

      {extractedFieldsExpanded === true && isAmazonScan === true ? (
        <div className='mt-3 space-y-3'>
          <ProductScanAmazonExtractedFieldsPanel scan={scan} formBindings={productFormBindings} />
        </div>
      ) : null}

      {diagnosticsExpanded === true ? (
        <div className='mt-3 space-y-3'>
          <h6 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Scan Diagnostics
          </h6>
          <ProductScanDiagnostics scan={scan} />
        </div>
      ) : null}

      {isExpanded === true && scanSteps.length > 0 ? (
        <div className='mt-3 space-y-2'>
          <h6 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Detailed Scan Steps
          </h6>
          <ProductScanSteps steps={scanSteps} />
        </div>
      ) : null}
    </>
  );
}
