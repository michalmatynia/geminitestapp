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
  const steps = Array.isArray(scan.steps) ? scan.steps : [];
  const active = isProductScanActiveStatus(scan.status);

  const prog = active ? resolveProductScanActiveStepSummary(steps) : null;
  const cont = active ? resolveProductScanContinuationSummary(steps) : null;
  
  const fail = scan.status === 'failed' || scan.status === 'conflict';
  const out = (prog === null && fail) ? resolveProductScanLatestOutcomeSummary(steps, { allowStalled: false }) : null;

  const evalSum = prog === null ? resolveProductScanEvaluationPolicySummary(steps) : null;
  const rejSum = (prog === null && cont === null) ? resolveProductScanRejectedCandidateSummary(steps) : null;

  return (
    <>
      <ProductScanActiveProgress summary={prog} />
      <ProductScanContinuationInfo summary={cont} />
      <ProductScanEvaluationPolicyInfo summary={evalSum} />
      <ProductScanRejectedCandidateInfo summary={rejSum} />
      <ProductScanLatestOutcomeInfo summary={out} />
    </>
  );
}
