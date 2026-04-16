'use client';

import React, { useMemo } from 'react';

import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import {
  hasProductScanAmazonDetails,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  ProductScan1688Details,
} from '@/features/products/components/scans/ProductScan1688Details';
import { ProductScan1688ApplyPanel } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import {
  ProductScanDiagnostics,
} from '@/features/products/components/scans/ProductScanDiagnostics';
import {
  ProductScanSteps,
} from '@/features/products/components/scans/ProductScanSteps';
import type {
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { resolveScanMessages } from './ProductFormScans.helpers';
import { ProductScanStatusHeader } from './ProductScanStatusHeader';
import { ProductScanActionButtons } from './ProductScanActionButtons';
import { ProductScanProgressInfo } from './ProductScanProgressInfo';
import { ProductScanRecommendationInfo } from './ProductScanRecommendationInfo';
import { ProductScanPolicyBlock } from './ProductScanPolicyBlock';
import { ProductScanUrlInfo } from './ProductScanUrlInfo';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type ProductScanHistoryRowProps = {
  scan: ProductScanRecord;
  productName: string;
  isExpanded: boolean;
  diagnosticsExpanded: boolean;
  extractedFieldsExpanded: boolean;
  isDeleting: boolean;
  onDelete: (scanId: string) => void;
  onToggleSteps: (scanId: string) => void;
  onToggleExtractedFields: (scanId: string) => void;
  onToggleDiagnostics: (scanId: string) => void;
  connectionNamesById: Map<string, string>;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  clearBlockedScanReviewed: (scanId: string | null | undefined) => void;
  supplier1688FormBindings: Supplier1688FormBindings;
  productFormBindings: ProductFormBindings;
};

export function ProductScanHistoryRow({
  scan,
  productName,
  isExpanded,
  diagnosticsExpanded,
  extractedFieldsExpanded,
  isDeleting,
  onDelete,
  onToggleSteps,
  onToggleExtractedFields,
  onToggleDiagnostics,
  connectionNamesById,
  isBlockedScanReviewed,
  markBlockedScanReviewed,
  clearBlockedScanReviewed,
  supplier1688FormBindings,
  productFormBindings,
}: ProductScanHistoryRowProps): React.JSX.Element {
  const scanSteps = Array.isArray(scan.steps) ? scan.steps : [];
  const isAmazonScan = scan.provider !== '1688';
  const { infoMessage, errorMessage } = resolveScanMessages(scan);

  const resolvedConnectionLabel = useMemo((): string | null => {
    if (isAmazonScan === true) return null;
    const connectionId = scan.connectionId;
    if (typeof connectionId === 'string' && connectionId !== '') {
      return connectionNamesById.get(connectionId) ?? connectionId;
    }
    return null;
  }, [isAmazonScan, scan.connectionId, connectionNamesById]);

  const hasExtractedFields =
    isAmazonScan === true &&
    (hasProductScanAmazonDetails(scan.amazonDetails) || (typeof scan.asin === 'string' && scan.asin !== ''));

  return (
    <section className='space-y-2 rounded-md border border-border/60 px-4 py-4'>
      <ProductScanStatusHeader
        scan={scan}
        productName={productName}
        isAmazonScan={isAmazonScan}
        resolvedConnectionLabel={resolvedConnectionLabel}
        isDeleting={isDeleting}
        onDelete={onDelete}
      />

      <ProductScanActionButtons
        scanId={scan.id}
        isAmazonScan={isAmazonScan}
        hasExtractedFields={hasExtractedFields}
        isExpanded={isExpanded}
        diagnosticsExpanded={diagnosticsExpanded}
        extractedFieldsExpanded={extractedFieldsExpanded}
        hasSteps={scanSteps.length > 0}
        onToggleSteps={onToggleSteps}
        onToggleExtractedFields={onToggleExtractedFields}
        onToggleDiagnostics={onToggleDiagnostics}
      />

      <ProductScanProgressInfo scan={scan} />

      {(typeof infoMessage === 'string' && infoMessage !== '') || (typeof errorMessage === 'string' && errorMessage !== '') ? (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            typeof errorMessage === 'string' && errorMessage !== ''
              ? 'border border-destructive/20 bg-destructive/5 text-destructive-foreground'
              : 'border border-border/50 bg-background/50 text-muted-foreground'
          }`}
        >
          {errorMessage ?? infoMessage}
        </div>
      ) : null}

      <ProductScanRecommendationInfo
        scan={scan}
        isAmazonScan={isAmazonScan}
        hasExtractedFields={hasExtractedFields}
      />

      <ProductScanPolicyBlock
        scan={scan}
        isAmazonScan={isAmazonScan}
        isBlockedScanReviewed={isBlockedScanReviewed}
        markBlockedScanReviewed={markBlockedScanReviewed}
        clearBlockedScanReviewed={clearBlockedScanReviewed}
      />

      <ProductScanUrlInfo scan={scan} isAmazonScan={isAmazonScan} />

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

      {isAmazonScan === false ? (
        <div className='mt-3 space-y-3'>
          <div className='border-t border-border/40 pt-3'>
            <ProductScan1688Details
              scan={scan}
              scanId={scan.id}
              connectionLabel={resolvedConnectionLabel}
            />
          </div>
          <div className='border-t border-border/40 pt-3'>
            <ProductScan1688ApplyPanel
              scan={scan}
              productId={scan.productId}
              productName={productName}
              formBindings={supplier1688FormBindings}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
