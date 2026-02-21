'use client';

import React from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { PriceGroup } from '@/shared/contracts/products';

type CatalogFormState = {
  name: string;
  description: string;
  isDefault: boolean;
};

type CatalogModalContextValue = {
  form: CatalogFormState;
  setForm: React.Dispatch<React.SetStateAction<CatalogFormState>>;
  selectedLanguageIds: string[];
  toggleLanguage: (id: string) => void;
  moveLanguage: (id: string, direction: 'up' | 'down') => void;
  defaultLanguageId: string;
  setDefaultLanguageId: React.Dispatch<React.SetStateAction<string>>;
  languageQuery: string;
  setLanguageQuery: React.Dispatch<React.SetStateAction<string>>;
  availableLanguages: Language[];
  getLanguage: (id: string) => Language | undefined;
  languagesLoading: boolean;
  languagesError?: string | null | undefined;
  error: string | null;
  catalogPriceGroupIds: string[];
  togglePriceGroup: (id: string) => void;
  catalogDefaultPriceGroupId: string;
  setCatalogDefaultPriceGroupId: React.Dispatch<React.SetStateAction<string>>;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
};

const CatalogModalContext = React.createContext<CatalogModalContextValue | null>(null);

type CatalogModalProviderProps = {
  value: CatalogModalContextValue;
  children: React.ReactNode;
};

export function CatalogModalProvider({
  value,
  children,
}: CatalogModalProviderProps): React.JSX.Element {
  return (
    <CatalogModalContext.Provider value={value}>
      {children}
    </CatalogModalContext.Provider>
  );
}

export function useCatalogModalContext(): CatalogModalContextValue {
  const context = React.useContext(CatalogModalContext);
  if (!context) {
    throw new Error('useCatalogModalContext must be used within CatalogModalProvider');
  }
  return context;
}
