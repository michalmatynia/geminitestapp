'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { RecommendedAmazonSummary } from './RecommendedAmazonSummary';
import { Recommended1688Summary } from './Recommended1688Summary';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type ProductFormRecommendedSummariesProps = {
  recommendedAmazonScan: ProductScanRecord | null;
  recommended1688Scan: ProductScanRecord | null;
  preferred1688Scans: ProductScanRecord[];
  isExtractedFieldsExpanded: boolean;
  onToggleExtractedFields: (id: string) => void;
  is1688BlockedReviewed: boolean;
  supplier1688FormBindings: Supplier1688FormBindings;
  productFormBindings: ProductFormBindings;
};

export function ProductFormRecommendedSummaries({
  recommendedAmazonScan,
  recommended1688Scan,
  preferred1688Scans,
  isExtractedFieldsExpanded,
  onToggleExtractedFields,
  is1688BlockedReviewed,
  supplier1688FormBindings,
  productFormBindings,
}: ProductFormRecommendedSummariesProps): React.JSX.Element | null {
  if (recommendedAmazonScan === null && recommended1688Scan === null) return null;

  return (
    <div className='grid gap-6 lg:grid-cols-1'>
      {recommendedAmazonScan !== null ? (
        <RecommendedAmazonSummary
          scan={recommendedAmazonScan}
          isExtractedFieldsExpanded={isExtractedFieldsExpanded}
          onToggleExtractedFields={onToggleExtractedFields}
          productFormBindings={productFormBindings}
        />
      ) : null}
      {recommended1688Scan !== null ? (
        <Recommended1688Summary
          scan={recommended1688Scan}
          preferredScans={preferred1688Scans}
          isBlockedReviewed={is1688BlockedReviewed}
          supplier1688FormBindings={supplier1688FormBindings}
        />
      ) : null}
    </div>
  );
}
