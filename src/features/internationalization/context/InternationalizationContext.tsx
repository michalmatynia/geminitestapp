'use client';

import React, { useCallback, type ReactNode } from 'react';

import type {
  CountryOption,
  CurrencyOption,
  Language,
} from '@/shared/contracts/internationalization';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useInternationalizationLogic } from './InternationalizationContext.logic';

export type ConfirmationConfig = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  isDangerous?: boolean;
};

export type ConfirmationState = ConfirmationConfig | null;

type InternationalizationConfirmationModalProps = {
  confirmation: ConfirmationState;
  setConfirmation: React.Dispatch<React.SetStateAction<ConfirmationState>>;
};

const EMPTY_CONFIRMATION_CONFIG: ConfirmationConfig = {
  title: '',
  message: '',
  confirmText: 'Confirm',
  isDangerous: false,
  onConfirm: () => {},
};

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

function InternationalizationConfirmationModal({
  confirmation,
  setConfirmation,
}: InternationalizationConfirmationModalProps): React.JSX.Element {
  const modalConfig = confirmation ?? EMPTY_CONFIRMATION_CONFIG;

  const handleConfirm = useCallback(async (): Promise<void> => {
    await modalConfig.onConfirm();
    setConfirmation(null);
  }, [modalConfig, setConfirmation]);

  return (
    <ConfirmModal
      isOpen={confirmation !== null}
      onClose={() => setConfirmation(null)}
      title={modalConfig.title}
      message={modalConfig.message}
      confirmText={modalConfig.confirmText ?? 'Confirm'}
      isDangerous={modalConfig.isDangerous ?? false}
      onConfirm={handleConfirm}
    />
  );
}

export function InternationalizationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { actions, confirmation, data, setConfirmation, ui } = useInternationalizationLogic();

  return (
    <InternationalizationDataContext.Provider value={data}>
      <InternationalizationUiContext.Provider value={ui}>
        <InternationalizationActionsContext.Provider value={actions}>
          {children}
          <InternationalizationConfirmationModal
            confirmation={confirmation}
            setConfirmation={setConfirmation}
          />
        </InternationalizationActionsContext.Provider>
      </InternationalizationUiContext.Provider>
    </InternationalizationDataContext.Provider>
  );
}
