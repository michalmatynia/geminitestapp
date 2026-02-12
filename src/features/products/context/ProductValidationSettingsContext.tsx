'use client';

import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationPostAcceptBehavior,
} from '@/shared/types/domain/products';

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

export interface ProductValidationSettingsValue {
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  setValidatorEnabled: Dispatch<SetStateAction<boolean>>;
  setFormatterEnabled: Dispatch<SetStateAction<boolean>>;
  validationDenyBehavior: ProductValidationDenyBehavior;
  setValidationDenyBehavior: Dispatch<SetStateAction<ProductValidationDenyBehavior>>;
  denyActionLabel: 'Deny' | 'Mute';
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  denyIssue: (input: ProductValidationDenyIssueInput) => void;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  acceptIssue: (input: ProductValidationAcceptIssueInput) => void;
}

const ProductValidationSettingsContext = createContext<ProductValidationSettingsValue | null>(null);

interface ProductValidationSettingsProviderProps {
  value: ProductValidationSettingsValue;
  children: React.ReactNode;
}

export function ProductValidationSettingsProvider({
  value,
  children,
}: ProductValidationSettingsProviderProps): React.JSX.Element {
  return (
    <ProductValidationSettingsContext.Provider value={value}>
      {children}
    </ProductValidationSettingsContext.Provider>
  );
}

export function useProductValidationSettings(): ProductValidationSettingsValue {
  const context = useContext(ProductValidationSettingsContext);
  if (!context) {
    throw internalError(
      'useProductValidationSettings must be used within ProductValidationSettingsProvider'
    );
  }
  return context;
}
