'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { resolveScanMessages } from './ProductFormScans.helpers';
import { ProductScanRecommendationInfo } from './ProductScanRecommendationInfo';

type ProductScanInfoSectionProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
  hasExtractedFields: boolean;
};

export function ProductScanInfoSection({
  scan,
  isAmazonScan,
  hasExtractedFields,
}: ProductScanInfoSectionProps): React.JSX.Element {
  const { infoMessage, errorMessage } = resolveScanMessages(scan);
  const hasInfo = typeof infoMessage === 'string' && infoMessage !== '';
  const hasError = typeof errorMessage === 'string' && errorMessage !== '';

  return (
    <>
      {hasInfo || hasError ? (
        <div className={`rounded-md px-3 py-2 text-sm ${hasError ? 'border border-destructive/20 bg-destructive/5 text-destructive-foreground' : 'border border-border/50 bg-background/50 text-muted-foreground'}`}>
          {errorMessage ?? infoMessage}
        </div>
      ) : null}

      <ProductScanRecommendationInfo
        scan={scan}
        isAmazonScan={isAmazonScan}
        hasExtractedFields={hasExtractedFields}
      />
    </>
  );
}
