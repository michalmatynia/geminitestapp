'use client';

import React from 'react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  resolveRejectedAmazonCandidateBreakdown,
  resolveAmazonScanRecommendationReason,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  resolve1688ScanRecommendationReason,
} from '@/features/products/components/scans/ProductScan1688Details';

type ProductScanRecommendationInfoProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
  hasExtractedFields: boolean;
};

export function ProductScanRecommendationInfo({
  scan,
  isAmazonScan,
  hasExtractedFields,
}: ProductScanRecommendationInfoProps): React.JSX.Element | null {
  const recommendationReason = React.useMemo((): string | null => {
    if (isAmazonScan === true) {
      return hasExtractedFields === true ? resolveAmazonScanRecommendationReason(scan) : null;
    }
    return resolve1688ScanRecommendationReason(scan);
  }, [scan, isAmazonScan, hasExtractedFields]);

  if (recommendationReason === null) return null;

  const recommendationRejectedBreakdown =
    isAmazonScan === true && hasExtractedFields === true
      ? resolveRejectedAmazonCandidateBreakdown(scan.steps)
      : null;

  return (
    <p className='text-xs font-medium text-muted-foreground'>
      AI recommendation: {recommendationReason}
      {isAmazonScan === true && recommendationRejectedBreakdown !== null && recommendationRejectedBreakdown.totalCount > 0 ? (
        <>
          {' '}
          (after {recommendationRejectedBreakdown.totalCount} rejected
          {recommendationRejectedBreakdown.languageRejectedCount > 0
            ? `, ${recommendationRejectedBreakdown.languageRejectedCount} non-English`
            : ''}
          )
        </>
      ) : null}
    </p>
  );
}
