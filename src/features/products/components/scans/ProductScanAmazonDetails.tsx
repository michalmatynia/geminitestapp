'use client';

import {
  ProductScanAmazonDetailsView,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonQualitySummary,
} from './ProductScanAmazonDetails.view';
import { hasText, isNullish } from './ProductScanAmazonDetails.format';
import {
  hasProductScanAmazonDetails,
  resolveAmazonScanQualitySummary,
  resolveAmazonScanRecommendationReason,
  resolvePreferredAmazonExtractedScans,
} from './ProductScanAmazonDetails.quality';
import {
  resolveRejectedAmazonCandidateBreakdown,
  resolveRejectedAmazonCandidateCount,
} from './ProductScanAmazonDetails.provenance';
import type {
  AmazonRejectedCandidateBreakdown,
  AmazonScanQualitySummary,
  ProductScanAmazonDetailsScan,
} from './ProductScanAmazonDetails.types';

export type { AmazonRejectedCandidateBreakdown, AmazonScanQualitySummary };

export {
  hasProductScanAmazonDetails,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonQualitySummary,
  resolveAmazonScanQualitySummary,
  resolveAmazonScanRecommendationReason,
  resolvePreferredAmazonExtractedScans,
  resolveRejectedAmazonCandidateBreakdown,
  resolveRejectedAmazonCandidateCount,
};

export function ProductScanAmazonDetails(props: {
  scan: ProductScanAmazonDetailsScan;
}): React.JSX.Element | null {
  if (hasAmazonDetailsPanelContent(props.scan) === false) return null;
  return <ProductScanAmazonDetailsView scan={props.scan} />;
}

const hasAmazonDetailsPanelContent = (scan: ProductScanAmazonDetailsScan): boolean =>
  hasProductScanAmazonDetails(scan.amazonDetails) ||
  hasText(scan.asin) ||
  isNullish(scan.amazonEvaluation) === false ||
  isNullish(scan.amazonProbe) === false;
