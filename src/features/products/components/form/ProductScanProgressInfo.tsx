'use client';

import React from 'react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import {
  resolveProductScanActiveStepSummary,
  resolveProductScanContinuationSummary,
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanRejectedCandidateSummary,
  resolveProductScanLatestOutcomeSummary,
} from '@/features/products/components/scans/ProductScanSteps';
import { ProductScanActiveProgress } from './ProductScanActiveProgress';
import { ProductScanContinuationInfo } from './ProductScanContinuationInfo';
import { ProductScanEvaluationPolicyInfo } from './ProductScanEvaluationPolicyInfo';
import { ProductScanRejectedCandidateInfo } from './ProductScanRejectedCandidateInfo';
import { ProductScanLatestOutcomeInfo } from './ProductScanLatestOutcomeInfo';

type ProductScanProgressInfoProps = {
  scan: ProductScanRecord;
};

export function ProductScanProgressInfo({
  scan,
}: ProductScanProgressInfoProps): React.JSX.Element | null {
  const scanSteps = Array.isArray(scan.steps) ? scan.steps : [];
  const isActive = isProductScanActiveStatus(scan.status);

  const progressSummary = isActive ? resolveProductScanActiveStepSummary(scanSteps) : null;
  const continuationSummary = isActive ? resolveProductScanContinuationSummary(scanSteps) : null;
  const rejectedCandidateSummary =
    progressSummary === null && continuationSummary === null
      ? resolveProductScanRejectedCandidateSummary(scanSteps)
      : null;
  const evaluationPolicySummary =
    progressSummary === null ? resolveProductScanEvaluationPolicySummary(scanSteps) : null;
  const latestOutcomeSummary =
    progressSummary === null && (scan.status === 'failed' || scan.status === 'conflict')
      ? resolveProductScanLatestOutcomeSummary(scanSteps, { allowStalled: false })
      : null;

  return (
    <>
      <ProductScanActiveProgress summary={progressSummary} />
      <ProductScanContinuationInfo summary={continuationSummary} />
      <ProductScanEvaluationPolicyInfo summary={evaluationPolicySummary} />
      <ProductScanRejectedCandidateInfo summary={rejectedCandidateSummary} />
      <ProductScanLatestOutcomeInfo summary={latestOutcomeSummary} />
    </>
  );
}
