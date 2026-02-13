'use client';

import React from 'react';

type CurrencyFormState = {
  code: string;
  name: string;
  symbol: string;
};

type CurrencyModalContextValue = {
  form: CurrencyFormState;
  setForm: React.Dispatch<React.SetStateAction<CurrencyFormState>>;
};

const CurrencyModalContext = React.createContext<CurrencyModalContextValue | null>(null);

export function CurrencyModalProvider({
  value,
  children,
}: {
  value: CurrencyModalContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CurrencyModalContext.Provider value={value}>
      {children}
    </CurrencyModalContext.Provider>
  );
}

export function useCurrencyModalContext(): CurrencyModalContextValue {
  const context = React.useContext(CurrencyModalContext);
  if (!context) {
    throw new Error('useCurrencyModalContext must be used inside CurrencyModalProvider');
  }
  return context;
}
