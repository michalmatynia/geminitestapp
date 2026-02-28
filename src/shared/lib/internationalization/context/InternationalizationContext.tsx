'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

import {
  useDeleteCountryMutation,
  useDeleteCurrencyMutation,
  useDeleteLanguageMutation,
} from '@/shared/lib/internationalization/hooks/useInternationalizationMutations';
import {
  useCountries,
  useCurrencies,
  useLanguages,
} from '@/shared/lib/internationalization/hooks/useInternationalizationQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type {
  CurrencyOption,
  CountryOption,
  Language,
} from '@/shared/contracts/internationalization';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

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
  isLanguageModalOpen: boolean;
  activeLanguage: Language | null;
  isCurrencyModalOpen: boolean;
  activeCurrency: CurrencyOption | null;
  isCountryModalOpen: boolean;
  activeCountry: CountryOption | null;

  // Handlers
  handleOpenLanguageModal: (language?: Language | null) => void;
  handleCloseLanguageModal: () => void;
  handleDeleteLanguage: (language: Language) => Promise<void>;

  handleOpenCurrencyModal: (currency?: CurrencyOption | null) => void;
  handleCloseCurrencyModal: () => void;
  handleDeleteCurrency: (currency: CurrencyOption) => Promise<void>;

  handleOpenCountryModal: (country?: CountryOption | null) => void;
  handleCloseCountryModal: () => void;
  handleDeleteCountry: (country: CountryOption) => Promise<void>;

  // Confirmation
  confirmation: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;
}

export const InternationalizationContext = createContext<InternationalizationContextType | null>(
  null
);

export function useInternationalizationContext(): InternationalizationContextType {
  const context = useContext(InternationalizationContext);
  if (!context) {
    throw internalError(
      'useInternationalizationContext must be used within an InternationalizationProvider'
    );
  }
  return context;
}

export function InternationalizationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();

  // Queries
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const {
    data: languages = [],
    isLoading: languagesLoading,
    error: languagesError,
  } = useLanguages();

  // Search state
  const [countrySearch, setCountrySearch] = useState('');

  // Modal State
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryOption | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null>(null);

  const confirmAction = (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => {
    setConfirmation(config);
  };

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
    confirmAction({
      title: 'Delete Language?',
      message: `Are you sure you want to delete ${l.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteLanguageMutation.mutateAsync(l.id);
          toast(`Language ${l.name} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'InternationalizationContext',
              action: 'deleteLanguage',
              languageId: l.id,
            },
          });
          toast('Failed to delete language.', { variant: 'error' });
        }
      },
    });
  };

  const handleOpenCurrencyModal = (currency?: CurrencyOption | null) => {
    setEditingCurrency(currency ?? null);
    setShowCurrencyModal(true);
  };

  const handleDeleteCurrency = async (c: CurrencyOption) => {
    confirmAction({
      title: 'Delete Currency?',
      message: `Are you sure you want to delete ${c.code}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteCurrencyMutation.mutateAsync(c.id);
          toast(`Currency ${c.code} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'InternationalizationContext',
              action: 'deleteCurrency',
              currencyId: c.id,
            },
          });
          toast('Failed to delete currency.', { variant: 'error' });
        }
      },
    });
  };

  const handleOpenCountryModal = (country?: CountryOption | null) => {
    setEditingCountry(country ?? null);
    setShowCountryModal(true);
  };

  const handleDeleteCountry = async (c: CountryOption) => {
    confirmAction({
      title: 'Delete Country?',
      message: `Are you sure you want to delete ${c.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteCountryMutation.mutateAsync(c.id);
          toast(`Country ${c.name} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'InternationalizationContext',
              action: 'deleteCountry',
              countryId: c.id,
            },
          });
          toast('Failed to delete country.', { variant: 'error' });
        }
      },
    });
  };

  const value: InternationalizationContextType = {
    currencies,
    loadingCurrencies,
    countries,
    loadingCountries,
    languages,
    languagesLoading,
    languagesError:
      languagesError instanceof Error ? languagesError.message : languagesError || null,

    countrySearch,
    setCountrySearch,
    filteredCountries,

    isLanguageModalOpen: showLanguageModal,
    activeLanguage: editingLanguage,
    isCurrencyModalOpen: showCurrencyModal,
    activeCurrency: editingCurrency,
    isCountryModalOpen: showCountryModal,
    activeCountry: editingCountry,

    handleOpenLanguageModal,
    handleCloseLanguageModal: () => setShowLanguageModal(false),
    handleDeleteLanguage,

    handleOpenCurrencyModal,
    handleCloseCurrencyModal: () => setShowCurrencyModal(false),
    handleDeleteCurrency,

    handleOpenCountryModal,
    handleCloseCountryModal: () => setShowCountryModal(false),
    handleDeleteCountry,

    confirmation,
    confirmAction,
  };

  return (
    <InternationalizationContext.Provider value={value}>
      {children}
      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) {
            await confirmation.onConfirm();
          }
          setConfirmation(null);
        }}
      />
    </InternationalizationContext.Provider>
  );
}
