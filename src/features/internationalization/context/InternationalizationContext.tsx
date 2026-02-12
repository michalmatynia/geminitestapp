'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

import { useDeleteCountryMutation, useDeleteCurrencyMutation, useDeleteLanguageMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import { useCountries, useCurrencies, useLanguages } from '@/features/internationalization/hooks/useInternationalizationQueries';
import { internalError } from '@/shared/errors/app-error';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';
import { useToast } from '@/shared/ui';

interface InternationalizationContextType {
  // Data & Loading
  currencies: CurrencyOption[];
  loadingCurrencies: boolean;
  countries: CountryOption[];
  loadingCountries: boolean;
  languages: Language[];
  languagesLoading: boolean;
  languagesError: string | null;
  
  // Search/Filter
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  filteredCountries: CountryOption[];
  
  // Modal State
  showLanguageModal: boolean;
  editingLanguage: Language | null;
  showCurrencyModal: boolean;
  editingCurrency: CurrencyOption | null;
  showCountryModal: boolean;
  editingCountry: CountryOption | null;
  
  // Handlers
  handleOpenLanguageModal: (language?: Language | null) => void;
  setLanguageModalOpen: (open: boolean) => void;
  handleDeleteLanguage: (language: Language) => Promise<void>;
  
  handleOpenCurrencyModal: (currency?: CurrencyOption | null) => void;
  setCurrencyModalOpen: (open: boolean) => void;
  handleDeleteCurrency: (currency: CurrencyOption) => Promise<void>;
  
  handleOpenCountryModal: (country?: CountryOption | null) => void;
  setCountryModalOpen: (open: boolean) => void;
  handleDeleteCountry: (country: CountryOption) => Promise<void>;
}

const InternationalizationContext = createContext<InternationalizationContextType | null>(null);

export function useInternationalizationContext(): InternationalizationContextType {
  const context = useContext(InternationalizationContext);
  if (!context) {
    throw internalError('useInternationalizationContext must be used within an InternationalizationProvider');
  }
  return context;
}

export function InternationalizationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  
  // Queries
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const { data: languages = [], isLoading: languagesLoading, error: languagesError } = useLanguages();

  // Search state
  const [countrySearch, setCountrySearch] = useState('');

  // Modal State
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryOption | null>(null);

  // Mutations
  const deleteCurrencyMutation = useDeleteCurrencyMutation();
  const deleteCountryMutation = useDeleteCountryMutation();
  const deleteLanguageMutation = useDeleteLanguageMutation();

  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c: CountryOption) =>
        c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
    );
  }, [countries, countrySearch]);

  const handleOpenLanguageModal = (language?: Language | null) => {
    setEditingLanguage(language ?? null);
    setShowLanguageModal(true);
  };

  const handleDeleteLanguage = async (l: Language) => {
    if (confirm(`Delete ${l.name}?`)) {
      try {
        await deleteLanguageMutation.mutateAsync(l.id);
        toast(`Language ${l.name} deleted.`, { variant: 'success' });
      } catch (error) {
        const { logClientError } = require('@/shared/utils/observability/client-error-logger');
        logClientError(error, { context: { source: 'InternationalizationContext', action: 'deleteLanguage', languageId: l.id } });
        toast('Failed to delete language.', { variant: 'error' });
      }
    }
  };

  const handleOpenCurrencyModal = (currency?: CurrencyOption | null) => {
    setEditingCurrency(currency ?? null);
    setShowCurrencyModal(true);
  };

  const handleDeleteCurrency = async (c: CurrencyOption) => {
    if (confirm(`Delete ${c.code}?`)) {
      try {
        await deleteCurrencyMutation.mutateAsync(c.id);
        toast(`Currency ${c.code} deleted.`, { variant: 'success' });
      } catch (error) {
        const { logClientError } = require('@/shared/utils/observability/client-error-logger');
        logClientError(error, { context: { source: 'InternationalizationContext', action: 'deleteCurrency', currencyId: c.id } });
        toast('Failed to delete currency.', { variant: 'error' });
      }
    }
  };

  const handleOpenCountryModal = (country?: CountryOption | null) => {
    setEditingCountry(country ?? null);
    setShowCountryModal(true);
  };

  const handleDeleteCountry = async (c: CountryOption) => {
    if (confirm(`Delete ${c.name}?`)) {
      try {
        await deleteCountryMutation.mutateAsync(c.id);
        toast(`Country ${c.name} deleted.`, { variant: 'success' });
      } catch (error) {
        const { logClientError } = require('@/shared/utils/observability/client-error-logger');
        logClientError(error, { context: { source: 'InternationalizationContext', action: 'deleteCountry', countryId: c.id } });
        toast('Failed to delete country.', { variant: 'error' });
      }
    }
  };

  const value: InternationalizationContextType = {
    currencies,
    loadingCurrencies,
    countries,
    loadingCountries,
    languages,
    languagesLoading,
    languagesError: languagesError instanceof Error ? languagesError.message : (languagesError || null),
    
    countrySearch,
    setCountrySearch,
    filteredCountries,
    
    showLanguageModal,
    editingLanguage,
    showCurrencyModal,
    editingCurrency,
    showCountryModal,
    editingCountry,
    
    handleOpenLanguageModal,
    setLanguageModalOpen: setShowLanguageModal,
    handleDeleteLanguage,
    
    handleOpenCurrencyModal,
    setCurrencyModalOpen: setShowCurrencyModal,
    handleDeleteCurrency,
    
    handleOpenCountryModal,
    setCountryModalOpen: setShowCountryModal,
    handleDeleteCountry,
  };

  return (
    <InternationalizationContext.Provider value={value}>
      {children}
    </InternationalizationContext.Provider>
  );
}
