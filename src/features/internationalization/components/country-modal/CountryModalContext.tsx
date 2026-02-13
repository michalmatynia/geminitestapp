'use client';

import React from 'react';

import type { CurrencyOption } from '@/shared/types/domain/internationalization';

type CountryFormState = {
  code: string;
  name: string;
};

type CountryModalContextValue = {
  form: CountryFormState;
  setForm: React.Dispatch<React.SetStateAction<CountryFormState>>;
  currencyOptions: CurrencyOption[];
  selectedCurrencyIds: string[];
  toggleCurrency: (id: string) => void;
  loadingCurrencies: boolean;
};

const CountryModalContext = React.createContext<CountryModalContextValue | null>(null);

export function CountryModalProvider({
  value,
  children,
}: {
  value: CountryModalContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CountryModalContext.Provider value={value}>
      {children}
    </CountryModalContext.Provider>
  );
}

export function useCountryModalContext(): CountryModalContextValue {
  const context = React.useContext(CountryModalContext);
  if (!context) {
    throw new Error('useCountryModalContext must be used inside CountryModalProvider');
  }
  return context;
}
