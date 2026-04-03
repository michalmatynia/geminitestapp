'use client';

import { useMemo, type Dispatch, type SetStateAction } from 'react';

import type {
  ProductValidationPattern,
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationDenyIssueInput,
  ProductValidationAcceptIssueInput,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { FieldValidatorIssue } from '../validation-engine/core';

// ── State sub-context ────────────────────────────────────────────────────────
// Re-renders consumers only when the boolean/enum settings change.

export interface ProductValidationStateValue {
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  validationDenyBehavior: ProductValidationDenyBehavior;
  denyActionLabel: 'Deny' | 'Mute';
  validatorPatterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
}

const { Context: ProductValidationStateContext, useStrictContext: useProductValidationState } =
  createStrictContext<ProductValidationStateValue>({
    hookName: 'useProductValidationState',
    providerName: 'ProductValidationSettingsProvider',
    displayName: 'ProductValidationStateContext',
    errorFactory: internalError,
  });

// ── Actions sub-context ──────────────────────────────────────────────────────
// Stable function references — subscribers do NOT re-render on state changes.

export interface ProductValidationActionsValue {
  setValidatorEnabled: Dispatch<SetStateAction<boolean>>;
  setFormatterEnabled: Dispatch<SetStateAction<boolean>>;
  setValidationDenyBehavior: Dispatch<SetStateAction<ProductValidationDenyBehavior>>;
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  denyIssue: (input: ProductValidationDenyIssueInput) => Promise<void>;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  acceptIssue: (input: ProductValidationAcceptIssueInput) => Promise<void>;
}

const {
  Context: ProductValidationActionsContext,
  useStrictContext: useProductValidationActions,
} = createStrictContext<ProductValidationActionsValue>({
  hookName: 'useProductValidationActions',
  providerName: 'ProductValidationSettingsProvider',
  displayName: 'ProductValidationActionsContext',
  errorFactory: internalError,
});

export { useProductValidationActions, useProductValidationState };

// ── Combined type & hook ─────────────────────────────────────────────────────

export interface ProductValidationSettingsValue
  extends ProductValidationStateValue, ProductValidationActionsValue {}

// ── Provider ─────────────────────────────────────────────────────────────────

interface ProductValidationSettingsProviderProps {
  value: ProductValidationSettingsValue;
  children: React.ReactNode;
}

export function ProductValidationSettingsProvider({
  value,
  children,
}: ProductValidationSettingsProviderProps): React.JSX.Element {
  const stateValue: ProductValidationStateValue = useMemo(
    () => ({
      validationInstanceScope: value.validationInstanceScope,
      validatorEnabled: value.validatorEnabled,
      formatterEnabled: value.formatterEnabled,
      validationDenyBehavior: value.validationDenyBehavior,
      denyActionLabel: value.denyActionLabel,
      validatorPatterns: value.validatorPatterns,
      latestProductValues: value.latestProductValues,
      visibleFieldIssues: value.visibleFieldIssues,
    }),
    [
      value.validationInstanceScope,
      value.validatorEnabled,
      value.formatterEnabled,
      value.validationDenyBehavior,
      value.denyActionLabel,
      value.validatorPatterns,
      value.latestProductValues,
      value.visibleFieldIssues,
    ]
  );

  const actionsValue: ProductValidationActionsValue = useMemo(
    () => ({
      setValidatorEnabled: value.setValidatorEnabled,
      setFormatterEnabled: value.setFormatterEnabled,
      setValidationDenyBehavior: value.setValidationDenyBehavior,
      getDenyActionLabel: value.getDenyActionLabel,
      isIssueDenied: value.isIssueDenied,
      denyIssue: value.denyIssue,
      isIssueAccepted: value.isIssueAccepted,
      acceptIssue: value.acceptIssue,
    }),
    [
      value.setValidatorEnabled,
      value.setFormatterEnabled,
      value.setValidationDenyBehavior,
      value.getDenyActionLabel,
      value.isIssueDenied,
      value.denyIssue,
      value.isIssueAccepted,
      value.acceptIssue,
    ]
  );

  return (
    <ProductValidationStateContext.Provider value={stateValue}>
      <ProductValidationActionsContext.Provider value={actionsValue}>
        {children}
      </ProductValidationActionsContext.Provider>
    </ProductValidationStateContext.Provider>
  );
}
