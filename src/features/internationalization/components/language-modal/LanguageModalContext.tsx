'use client';

import React from 'react';

import type { CountryOption } from '@/shared/types/domain/internationalization';

type LanguageFormState = {
  code: string;
  name: string;
  nativeName: string;
};

type LanguageModalContextValue = {
  form: LanguageFormState;
  setForm: React.Dispatch<React.SetStateAction<LanguageFormState>>;
  countries: CountryOption[];
  selectedCountryIds: string[];
  toggleCountry: (id: string) => void;
};

const LanguageModalContext = React.createContext<LanguageModalContextValue | null>(null);

export function LanguageModalProvider({
  value,
  children,
}: {
  value: LanguageModalContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <LanguageModalContext.Provider value={value}>
      {children}
    </LanguageModalContext.Provider>
  );
}

export function useLanguageModalContext(): LanguageModalContextValue {
  const context = React.useContext(LanguageModalContext);
  if (!context) {
    throw new Error('useLanguageModalContext must be used inside LanguageModalProvider');
  }
  return context;
}
