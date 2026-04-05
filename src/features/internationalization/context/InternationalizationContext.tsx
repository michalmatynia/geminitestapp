'use client';

import React, { useMemo, useState, type ReactNode } from 'react';

import {
  useDeleteCountryMutation,
  useDeleteCurrencyMutation,
  useDeleteLanguageMutation,
} from '@/features/internationalization/hooks/useInternationalizationMutations';
import type {
  CountryOption,
  CurrencyOption,
  Language,
} from '@/shared/contracts/internationalization';
import { internalError } from '@/shared/errors/app-error';
import { useCountries, useCurrencies, useLanguages } from '@/shared/hooks/use-i18n-queries';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui/primitives.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type ConfirmationConfig = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  isDangerous?: boolean;
};

type ConfirmationState = ConfirmationConfig | null;

export interface InternationalizationDataContextType {
  currencies: CurrencyOption[];
  loadingCurrencies: boolean;
  countries: CountryOption[];
  loadingCountries: boolean;
  filteredCountries: CountryOption[];
  languages: Language[];
  languagesLoading: boolean;
  languagesError: string | null;
}

export interface InternationalizationUiContextType {
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  isLanguageModalOpen: boolean;
  activeLanguage: Language | null;
  isCurrencyModalOpen: boolean;
  activeCurrency: CurrencyOption | null;
  isCountryModalOpen: boolean;
  activeCountry: CountryOption | null;
}

export interface InternationalizationActionsContextType {
  handleOpenLanguageModal: (language?: Language | null) => void;
  handleCloseLanguageModal: () => void;
  handleDeleteLanguage: (language: Language) => Promise<void>;
  handleOpenCurrencyModal: (currency?: CurrencyOption | null) => void;
  handleCloseCurrencyModal: () => void;
  handleDeleteCurrency: (currency: CurrencyOption) => Promise<void>;
  handleOpenCountryModal: (country?: CountryOption | null) => void;
  handleCloseCountryModal: () => void;
  handleDeleteCountry: (country: CountryOption) => Promise<void>;
  confirmAction: (config: ConfirmationConfig) => void;
}

export type InternationalizationContextType = InternationalizationDataContextType &
  InternationalizationUiContextType &
  InternationalizationActionsContextType;

const {
  Context: InternationalizationDataContext,
  useStrictContext: useInternationalizationData,
} = createStrictContext<InternationalizationDataContextType>({
  hookName: 'useInternationalizationData',
  providerName: 'an InternationalizationProvider',
  displayName: 'InternationalizationDataContext',
  errorFactory: internalError,
});

const {
  Context: InternationalizationUiContext,
  useStrictContext: useInternationalizationUi,
} = createStrictContext<InternationalizationUiContextType>({
  hookName: 'useInternationalizationUi',
  providerName: 'an InternationalizationProvider',
  displayName: 'InternationalizationUiContext',
  errorFactory: internalError,
});

const {
  Context: InternationalizationActionsContext,
  useStrictContext: useInternationalizationActions,
} = createStrictContext<InternationalizationActionsContextType>({
  hookName: 'useInternationalizationActions',
  providerName: 'an InternationalizationProvider',
  displayName: 'InternationalizationActionsContext',
  errorFactory: internalError,
});

export {
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
};

export function useInternationalizationContext(): InternationalizationContextType {
  const data = useInternationalizationData();
  const ui = useInternationalizationUi();
  const actions = useInternationalizationActions();
  return {
    ...data,
    ...ui,
    ...actions,
  };
}

export function InternationalizationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();

  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const {
    data: languages = [],
    isLoading: languagesLoading,
    error: languagesError,
  } = useLanguages();

  const [countrySearch, setCountrySearch] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryOption | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);

  const deleteCurrencyMutation = useDeleteCurrencyMutation();
  const deleteCountryMutation = useDeleteCountryMutation();
  const deleteLanguageMutation = useDeleteLanguageMutation();

  const normalizedLanguagesError =
    languagesError instanceof Error ? languagesError.message : languagesError || null;

  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (country: CountryOption) =>
        country.name.toLowerCase().includes(term) || country.code.toLowerCase().includes(term)
    );
  }, [countries, countrySearch]);

  const confirmAction = (config: ConfirmationConfig): void => {
    setConfirmation(config);
  };

  const handleOpenLanguageModal = (language?: Language | null): void => {
    setEditingLanguage(language ?? null);
    setShowLanguageModal(true);
  };

  const handleDeleteLanguage = async (language: Language): Promise<void> => {
    confirmAction({
      title: 'Delete Language?',
      message: `Are you sure you want to delete ${language.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteLanguageMutation.mutateAsync(language.id);
          toast(`Language ${language.name} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'InternationalizationContext',
            action: 'deleteLanguage',
            languageId: language.id,
          });
          toast('Failed to delete language.', { variant: 'error' });
        }
      },
    });
  };

  const handleOpenCurrencyModal = (currency?: CurrencyOption | null): void => {
    setEditingCurrency(currency ?? null);
    setShowCurrencyModal(true);
  };

  const handleDeleteCurrency = async (currency: CurrencyOption): Promise<void> => {
    confirmAction({
      title: 'Delete Currency?',
      message: `Are you sure you want to delete ${currency.code}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteCurrencyMutation.mutateAsync(currency.id);
          toast(`Currency ${currency.code} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'InternationalizationContext',
            action: 'deleteCurrency',
            currencyId: currency.id,
          });
          toast('Failed to delete currency.', { variant: 'error' });
        }
      },
    });
  };

  const handleOpenCountryModal = (country?: CountryOption | null): void => {
    setEditingCountry(country ?? null);
    setShowCountryModal(true);
  };

  const handleDeleteCountry = async (country: CountryOption): Promise<void> => {
    confirmAction({
      title: 'Delete Country?',
      message: `Are you sure you want to delete ${country.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteCountryMutation.mutateAsync(country.id);
          toast(`Country ${country.name} deleted.`, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'InternationalizationContext',
            action: 'deleteCountry',
            countryId: country.id,
          });
          toast('Failed to delete country.', { variant: 'error' });
        }
      },
    });
  };

  const dataValue = useMemo<InternationalizationDataContextType>(
    () => ({
      currencies,
      loadingCurrencies,
      countries,
      loadingCountries,
      filteredCountries,
      languages,
      languagesLoading,
      languagesError: normalizedLanguagesError,
    }),
    [
      currencies,
      loadingCurrencies,
      countries,
      loadingCountries,
      filteredCountries,
      languages,
      languagesLoading,
      normalizedLanguagesError,
    ]
  );

  const uiValue = useMemo<InternationalizationUiContextType>(
    () => ({
      countrySearch,
      setCountrySearch,
      isLanguageModalOpen: showLanguageModal,
      activeLanguage: editingLanguage,
      isCurrencyModalOpen: showCurrencyModal,
      activeCurrency: editingCurrency,
      isCountryModalOpen: showCountryModal,
      activeCountry: editingCountry,
    }),
    [
      countrySearch,
      showLanguageModal,
      editingLanguage,
      showCurrencyModal,
      editingCurrency,
      showCountryModal,
      editingCountry,
    ]
  );

  const actionsValue = useMemo<InternationalizationActionsContextType>(
    () => ({
      handleOpenLanguageModal,
      handleCloseLanguageModal: () => setShowLanguageModal(false),
      handleDeleteLanguage,
      handleOpenCurrencyModal,
      handleCloseCurrencyModal: () => setShowCurrencyModal(false),
      handleDeleteCurrency,
      handleOpenCountryModal,
      handleCloseCountryModal: () => setShowCountryModal(false),
      handleDeleteCountry,
      confirmAction,
    }),
    [handleDeleteCountry, handleDeleteCurrency, handleDeleteLanguage]
  );

  return (
    <InternationalizationDataContext.Provider value={dataValue}>
      <InternationalizationUiContext.Provider value={uiValue}>
        <InternationalizationActionsContext.Provider value={actionsValue}>
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
        </InternationalizationActionsContext.Provider>
      </InternationalizationUiContext.Provider>
    </InternationalizationDataContext.Provider>
  );
}
