'use client';

import React from 'react';

type PriceGroupFormState = {
  name: string;
  currencyCode: string;
  isDefault: boolean;
};

type PriceGroupModalContextValue = {
  form: PriceGroupFormState;
  setForm: React.Dispatch<React.SetStateAction<PriceGroupFormState>>;
};

const PriceGroupModalContext = React.createContext<PriceGroupModalContextValue | null>(null);

export function PriceGroupModalProvider({
  value,
  children,
}: {
  value: PriceGroupModalContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PriceGroupModalContext.Provider value={value}>
      {children}
    </PriceGroupModalContext.Provider>
  );
}

export function usePriceGroupModalContext(): PriceGroupModalContextValue {
  const context = React.useContext(PriceGroupModalContext);
  if (!context) {
    throw new Error('usePriceGroupModalContext must be used inside PriceGroupModalProvider');
  }
  return context;
}
