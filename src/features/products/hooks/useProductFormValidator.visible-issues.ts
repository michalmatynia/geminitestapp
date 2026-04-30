'use client';

import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import { getProductValidationFieldChangedAtDependencies } from '@/features/products/lib/validatorTargetAdapters';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

import type { ProductValidatorFieldIssues } from './useProductValidatorIssues.types';

type UseProductFormValidatorVisibleIssuesArgs = {
  categories: ProductCategory[];
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  latestProductValues: Record<string, unknown> | null;
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  validatorPatterns: ProductValidationPattern[];
  validatorValues: Record<string, unknown>;
};

const resolveProductFormFieldChangedAt = (
  fieldName: string,
  timestamps: Record<string, number>
): number =>
  getProductValidationFieldChangedAtDependencies(fieldName).reduce(
    (max, dependency) => Math.max(max, timestamps[dependency] ?? 0),
    0
  );

export const useProductFormValidatorVisibleIssues = ({
  categories,
  isIssueAccepted,
  isIssueDenied,
  latestProductValues,
  validationInstanceScope,
  validatorEnabled,
  validatorPatterns,
  validatorValues,
}: UseProductFormValidatorVisibleIssuesArgs): ProductValidatorFieldIssues => {
  const { visibleFieldIssues } = useProductValidatorIssues({
    categories,
    isIssueAccepted,
    isIssueDenied,
    latestProductValues,
    patterns: validatorPatterns,
    resolveChangedAt: resolveProductFormFieldChangedAt,
    runtimeValues: validatorValues,
    source: 'ProductForm',
    validationScope: validationInstanceScope,
    validatorEnabled,
    values: validatorValues,
  });

  return visibleFieldIssues;
};
