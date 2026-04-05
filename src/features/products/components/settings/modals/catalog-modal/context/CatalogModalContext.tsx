'use client';

import React from 'react';

import type { Language } from '@/shared/contracts/internationalization';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: CatalogModalContext, useStrictContext: useCatalogModalContext } =
  createStrictContext<CatalogModalContextValue>({
    hookName: 'useCatalogModalContext',
    providerName: 'CatalogModalProvider',
    displayName: 'CatalogModalContext',
    errorFactory: internalError,
  });

export { useCatalogModalContext };

type CatalogModalProviderProps = {
  value: CatalogModalContextValue;
  children: React.ReactNode;
};

export function CatalogModalProvider({
  value,
  children,
}: CatalogModalProviderProps): React.JSX.Element {
  return <CatalogModalContext.Provider value={value}>{children}</CatalogModalContext.Provider>;
}
