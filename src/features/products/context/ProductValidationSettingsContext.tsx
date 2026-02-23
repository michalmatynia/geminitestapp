'use client';

import {
  createContext,
  useContext,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { 
  ProductValidationPattern,
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationPostAcceptBehavior,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

import type { FieldValidatorIssue } from '../validation-engine/core';

export type ProductValidationDenyIssueInput = {
  fieldName: string;
  patternId: string;
  message?: string | null;
  replacementValue?: string | null;
};

export type ProductValidationAcceptIssueInput = {
  fieldName: string;
  patternId: string;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  message?: string | null;
  replacementValue?: string | null;
};

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

const ProductValidationStateContext =
  createContext<ProductValidationStateValue | null>(null);

export function useProductValidationState(): ProductValidationStateValue {
  const ctx = useContext(ProductValidationStateContext);
  if (!ctx) {
    throw internalError(
      'useProductValidationState must be used within ProductValidationSettingsProvider'
    );
  }
  return ctx;
}

// ── Actions sub-context ──────────────────────────────────────────────────────
// Stable function references — subscribers do NOT re-render on state changes.

export interface ProductValidationActionsValue {
  setValidatorEnabled: Dispatch<SetStateAction<boolean>>;
  setFormatterEnabled: Dispatch<SetStateAction<boolean>>;
  setValidationDenyBehavior: Dispatch<SetStateAction<ProductValidationDenyBehavior>>;
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  denyIssue: (input: ProductValidationDenyIssueInput) => void;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  acceptIssue: (input: ProductValidationAcceptIssueInput) => void;
}

const ProductValidationActionsContext =
  createContext<ProductValidationActionsValue | null>(null);

export function useProductValidationActions(): ProductValidationActionsValue {
  const ctx = useContext(ProductValidationActionsContext);
  if (!ctx) {
    throw internalError(
      'useProductValidationActions must be used within ProductValidationSettingsProvider'
    );
  }
  return ctx;
}

// ── Combined type & backward-compatible hook ─────────────────────────────────

export interface ProductValidationSettingsValue
  extends ProductValidationStateValue,
    ProductValidationActionsValue {}

/**
 * Combined hook for components that need both state and actions.
 * Prefer `useProductValidationState()` or `useProductValidationActions()`
 * for components that only need one subset, to avoid unnecessary re-renders.
 */
export function useProductValidationSettings(): ProductValidationSettingsValue {
  const state = useProductValidationState();
  const actions = useProductValidationActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

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
