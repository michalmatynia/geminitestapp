'use client';

import React from 'react';

import type { ProductScanRecord, ProductScanStep } from '@/shared/contracts/product-scans';
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

type ScanSummaries = {
  prog: ReturnType<typeof resolveProductScanActiveStepSummary>;
  cont: ReturnType<typeof resolveProductScanContinuationSummary>;
  evSum: ReturnType<typeof resolveProductScanEvaluationPolicySummary>;
  reSum: ReturnType<typeof resolveProductScanRejectedCandidateSummary>;
  outSum: ReturnType<typeof resolveProductScanLatestOutcomeSummary>;
};

type ActiveSummaries = {
  prog: ReturnType<typeof resolveProductScanActiveStepSummary>;
  cont: ReturnType<typeof resolveProductScanContinuationSummary>;
};

function resolveActiveSummaries(active: boolean, steps: ProductScanStep[]): ActiveSummaries {
  return {
    prog: active ? resolveProductScanActiveStepSummary(steps) : null,
    cont: active ? resolveProductScanContinuationSummary(steps) : null,
  };
}

function resolveSummaries(scan: ProductScanRecord): ScanSummaries {
  const steps = Array.isArray(scan.steps) ? scan.steps : [];
  const active = isProductScanActiveStatus(scan.status);
  const { prog, cont } = resolveActiveSummaries(active, steps);
  
  const isFail = scan.status === 'failed' || scan.status === 'conflict';
  
  return {
    prog,
    cont,
    evSum: (prog === null) ? resolveProductScanEvaluationPolicySummary(steps) : null,
    reSum: (prog === null && cont === null) ? resolveProductScanRejectedCandidateSummary(steps) : null,
    outSum: (prog === null && isFail) ? resolveProductScanLatestOutcomeSummary(steps, { allowStalled: false }) : null,
  };
}

export function ProductScanProgressInfo({
  scan,
}: ProductScanProgressInfoProps): React.JSX.Element | null {
  const { prog, cont, evSum, reSum, outSum } = resolveSummaries(scan);

  return (
    <>
      <ProductScanActiveProgress summary={prog} />
      <ProductScanContinuationInfo summary={cont} />
      <ProductScanEvaluationPolicyInfo summary={evSum} />
      <ProductScanRejectedCandidateInfo summary={reSum} />
      <ProductScanLatestOutcomeInfo summary={outSum} />
    </>
  );
}
