import type { SetStateAction } from 'react';

import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import type {
  ProductValidationAcceptIssueInput,
  ProductValidationDenyBehavior,
  ProductValidationDenyIssueInput,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

export interface UseProductFormValidatorResult {
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  setValidatorEnabled: (enabled: SetStateAction<boolean>) => void;
  setFormatterEnabled: (enabled: SetStateAction<boolean>) => void;
  validationDenyBehavior: ProductValidationDenyBehavior;
  setValidationDenyBehavior: (behavior: ProductValidationDenyBehavior) => void;
  denyActionLabel: 'Deny' | 'Mute';
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  denyIssue: (input: ProductValidationDenyIssueInput) => Promise<void>;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  acceptIssue: (input: ProductValidationAcceptIssueInput) => Promise<void>;
  validatorPatterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
  setValidatorManuallyChanged: (changed: boolean) => void;
}

export type ProductFormValidatorDecisionKeyBuilder = (
  fieldName: string,
  patternId: string
) => string;
