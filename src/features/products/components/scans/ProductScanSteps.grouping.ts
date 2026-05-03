import type { ProductScanStep } from '@/shared/contracts/product-scans';

import type { ProductScanStepGroupView, ProductScanStepsStats } from './ProductScanSteps.types';
import {
  getStepGroupOrder,
  resolveNonEmptyString,
  resolveStepAttempt,
  resolveStepGroup,
} from './ProductScanSteps.utils';

const appendStepToGroup = (
  groups: ProductScanStepGroupView[],
  step: ProductScanStep
): ProductScanStepGroupView[] => {
  const group = resolveStepGroup(step);
  const groupIndex = groups.findIndex((entry) => entry.group === group);
  if (groupIndex === -1) return [...groups, { group, steps: [step] }];
  return groups.map((entry, index) =>
    index === groupIndex ? { ...entry, steps: [...entry.steps, step] } : entry
  );
};

export const buildGroupedProductScanSteps = (
  steps: ProductScanStep[]
): ProductScanStepGroupView[] =>
  steps
    .reduce<ProductScanStepGroupView[]>(appendStepToGroup, [])
    .sort((left, right) => getStepGroupOrder(left.group) - getStepGroupOrder(right.group));

const countUniqueAttempts = (
  steps: ProductScanStep[],
  predicate: (step: ProductScanStep) => boolean
): number =>
  new Set(
    steps
      .filter(predicate)
      .map(resolveStepAttempt)
      .filter((attempt): attempt is number => attempt !== null)
  ).size;

export const buildProductScanStepsStats = (
  steps: ProductScanStep[]
): ProductScanStepsStats => ({
  warningCount: steps.filter((step) => resolveNonEmptyString(step.warning) !== null).length,
  failedCount: steps.filter((step) => step.status === 'failed').length,
  retryCount: steps.filter((step) => resolveNonEmptyString(step.retryOf) !== null).length,
  amazonCandidateAttemptCount: countUniqueAttempts(
    steps,
    (step) => resolveStepGroup(step) === 'amazon'
  ),
  supplierCandidateAttemptCount: countUniqueAttempts(
    steps,
    (step) => step.key === 'supplier_open'
  ),
});
