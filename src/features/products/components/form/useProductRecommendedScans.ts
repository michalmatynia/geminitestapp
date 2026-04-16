'use client';

import { useMemo } from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  resolvePreferredAmazonExtractedScans,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  resolvePreferred1688SupplierScans,
} from '@/features/products/components/scans/ProductScan1688Details';

export type ProductRecommendedScansResult = {
  recommendedAmazonScan: ProductScanRecord | null;
  recommended1688Scan: ProductScanRecord | null;
  recommendedAmazonExtractedScanId: string | null;
};

export function useProductRecommendedScans(scans: ProductScanRecord[]): ProductRecommendedScansResult {
  const preferredAmazonScans = useMemo(() => resolvePreferredAmazonExtractedScans(scans), [scans]);
  const recommendedAmazonExtractedScanId = preferredAmazonScans[0]?.id ?? null;
  const preferred1688Scans = useMemo(() => resolvePreferred1688SupplierScans(scans), [scans]);

  const recommendedAmazonScan = useMemo((): ProductScanRecord | null => {
    if (recommendedAmazonExtractedScanId === null) return null;
    return scans.find((s) => s.id === recommendedAmazonExtractedScanId) ?? null;
  }, [recommendedAmazonExtractedScanId, scans]);

  const recommended1688Scan = preferred1688Scans[0] ?? null;

  return {
    recommendedAmazonScan,
    recommended1688Scan,
    recommendedAmazonExtractedScanId,
  };
}
