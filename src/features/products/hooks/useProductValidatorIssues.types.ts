import type { MutableRefObject } from 'react';

import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

export type ProductValidatorFieldIssues = Record<string, FieldValidatorIssue[]>;

export type ProductValidatorTimestampResolver = (
  fieldName: string,
  timestamps: Record<string, number>
) => number;

export type ProductValidatorTimestampRef = MutableRefObject<Record<string, number>>;

export type UseProductValidatorIssuesOptions = {
  values: Record<string, unknown>;
  runtimeValues?: Record<string, unknown>;
  patterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  categories?: ReadonlyArray<ProductCategory>;
  validationScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  runtimeDebounceMs?: number;
  trackedFields?: string[];
  resolveChangedAt?: ProductValidatorTimestampResolver;
  source: string;
};

export type UseProductValidatorIssuesResult = {
  fieldIssues: ProductValidatorFieldIssues;
  visibleFieldIssues: ProductValidatorFieldIssues;
};
