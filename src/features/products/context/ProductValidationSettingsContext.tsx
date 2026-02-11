'use client';

import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';

export interface ProductValidationSettingsValue {
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  setValidatorEnabled: Dispatch<SetStateAction<boolean>>;
  setFormatterEnabled: Dispatch<SetStateAction<boolean>>;
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
    throw new Error(
      'useProductValidationSettings must be used within ProductValidationSettingsProvider'
    );
  }
  return context;
}
