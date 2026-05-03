'use client';

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

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
import { useCountries, useCurrencies, useLanguages } from '@/shared/hooks/use-i18n-queries';
import { useToast } from '@/shared/ui/primitives.public';

import type {
  ConfirmationConfig,
  ConfirmationState,
  InternationalizationActionsContextType,
  InternationalizationDataContextType,
  InternationalizationUiContextType,
} from './InternationalizationContext';

type DeleteMutation = {
  mutateAsync: (id: string) => Promise<unknown>;
};

type DeletableInternationalizationItem = {
  id: string;
  name?: string;
  code?: string;
};

type InternationalizationLogic = {
  data: InternationalizationDataContextType;
  ui: InternationalizationUiContextType;
  actions: InternationalizationActionsContextType;
  confirmation: ConfirmationState;
  setConfirmation: Dispatch<SetStateAction<ConfirmationState>>;
};

type InternationalizationModalState = {
  countrySearch: string;
  setCountrySearch: Dispatch<SetStateAction<string>>;
  showLanguageModal: boolean;
  setShowLanguageModal: Dispatch<SetStateAction<boolean>>;
  editingLanguage: Language | null;
  setEditingLanguage: Dispatch<SetStateAction<Language | null>>;
  showCurrencyModal: boolean;
  setShowCurrencyModal: Dispatch<SetStateAction<boolean>>;
  editingCurrency: CurrencyOption | null;
  setEditingCurrency: Dispatch<SetStateAction<CurrencyOption | null>>;
  showCountryModal: boolean;
  setShowCountryModal: Dispatch<SetStateAction<boolean>>;
  editingCountry: CountryOption | null;
  setEditingCountry: Dispatch<SetStateAction<CountryOption | null>>;
  confirmation: ConfirmationState;
  setConfirmation: Dispatch<SetStateAction<ConfirmationState>>;
};

type InternationalizationDeleteActions = Pick<
  InternationalizationActionsContextType,
  'confirmAction' | 'handleDeleteCountry' | 'handleDeleteCurrency' | 'handleDeleteLanguage'
>;

function useInternationalizationModalState(): InternationalizationModalState {
  const [countrySearch, setCountrySearch] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryOption | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);

  return useMemo(
    () => ({
      countrySearch,
      setCountrySearch,
      showLanguageModal,
      setShowLanguageModal,
      editingLanguage,
      setEditingLanguage,
      showCurrencyModal,
      setShowCurrencyModal,
      editingCurrency,
      setEditingCurrency,
      showCountryModal,
      setShowCountryModal,
      editingCountry,
      setEditingCountry,
      confirmation,
      setConfirmation,
    }),
    [
      countrySearch,
      showLanguageModal,
      editingLanguage,
      showCurrencyModal,
      editingCurrency,
      showCountryModal,
      editingCountry,
      confirmation,
    ]
  );
}

function useInternationalizationDataValue(
  countrySearch: string
): InternationalizationDataContextType {
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const {
    data: languages = [],
    error: languagesError,
    isLoading: languagesLoading,
  } = useLanguages();

  const normalizedLanguagesError =
    languagesError instanceof Error ? languagesError.message : null;

  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    if (term.length === 0) return countries;
    return countries.filter(
      (country: CountryOption) =>
        country.name.toLowerCase().includes(term) || country.code.toLowerCase().includes(term)
    );
  }, [countries, countrySearch]);

  return useMemo(
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
}

function useInternationalizationDeleteActions(
  setConfirmation: Dispatch<SetStateAction<ConfirmationState>>
): InternationalizationDeleteActions {
  const { toast } = useToast();
  const deleteCurrencyMutation = useDeleteCurrencyMutation();
  const deleteCountryMutation = useDeleteCountryMutation();
  const deleteLanguageMutation = useDeleteLanguageMutation();

  const confirmAction = useCallback((config: ConfirmationConfig): void => {
    setConfirmation(config);
  }, [setConfirmation]);

  const handleDelete = useCallback(
    (
      item: DeletableInternationalizationItem,
      mutation: DeleteMutation,
      label: string
    ): Promise<void> => {
      confirmAction({
        title: `Delete ${label}?`,
        message: `Are you sure you want to delete ${item.name ?? item.code}? This action cannot be undone.`,
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: async () => {
          await mutation.mutateAsync(item.id);
          toast(`${label} deleted.`, { variant: 'success' });
        },
      });
      return Promise.resolve();
    },
    [confirmAction, toast]
  );

  return useMemo(
    () => ({
      handleDeleteLanguage: (language: Language) =>
        handleDelete(language, deleteLanguageMutation, 'Language'),
      handleDeleteCurrency: (currency: CurrencyOption) =>
        handleDelete(currency, deleteCurrencyMutation, 'Currency'),
      handleDeleteCountry: (country: CountryOption) =>
        handleDelete(country, deleteCountryMutation, 'Country'),
      confirmAction,
    }),
    [
      confirmAction,
      deleteCountryMutation,
      deleteCurrencyMutation,
      deleteLanguageMutation,
      handleDelete,
    ]
  );
}

function useInternationalizationUiValue(
  modalState: InternationalizationModalState
): InternationalizationUiContextType {
  return useMemo(
    () => ({
      countrySearch: modalState.countrySearch,
      setCountrySearch: modalState.setCountrySearch,
      isLanguageModalOpen: modalState.showLanguageModal,
      activeLanguage: modalState.editingLanguage,
      isCurrencyModalOpen: modalState.showCurrencyModal,
      activeCurrency: modalState.editingCurrency,
      isCountryModalOpen: modalState.showCountryModal,
      activeCountry: modalState.editingCountry,
    }),
    [modalState]
  );
}

function useInternationalizationActionsValue(
  modalState: InternationalizationModalState,
  deleteActions: InternationalizationDeleteActions
): InternationalizationActionsContextType {
  return useMemo(
    () => ({
      handleOpenLanguageModal: (language: Language | null = null) => {
        modalState.setEditingLanguage(language);
        modalState.setShowLanguageModal(true);
      },
      handleCloseLanguageModal: () => modalState.setShowLanguageModal(false),
      handleDeleteLanguage: deleteActions.handleDeleteLanguage,
      handleOpenCurrencyModal: (currency: CurrencyOption | null = null) => {
        modalState.setEditingCurrency(currency);
        modalState.setShowCurrencyModal(true);
      },
      handleCloseCurrencyModal: () => modalState.setShowCurrencyModal(false),
      handleDeleteCurrency: deleteActions.handleDeleteCurrency,
      handleOpenCountryModal: (country: CountryOption | null = null) => {
        modalState.setEditingCountry(country);
        modalState.setShowCountryModal(true);
      },
      handleCloseCountryModal: () => modalState.setShowCountryModal(false),
      handleDeleteCountry: deleteActions.handleDeleteCountry,
      confirmAction: deleteActions.confirmAction,
    }),
    [deleteActions, modalState]
  );
}

export function useInternationalizationLogic(): InternationalizationLogic {
  const modalState = useInternationalizationModalState();
  const data = useInternationalizationDataValue(modalState.countrySearch);
  const ui = useInternationalizationUiValue(modalState);
  const deleteActions = useInternationalizationDeleteActions(modalState.setConfirmation);
  const actions = useInternationalizationActionsValue(modalState, deleteActions);

  return {
    data,
    ui,
    actions,
    confirmation: modalState.confirmation,
    setConfirmation: modalState.setConfirmation,
  };
}
