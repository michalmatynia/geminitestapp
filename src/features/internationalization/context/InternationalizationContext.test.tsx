// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InternationalizationProvider,
  useInternationalizationActions,
  useInternationalizationData,
  useInternationalizationUi,
} from './InternationalizationContext';

const mocks = vi.hoisted(() => ({
  deleteCountryMutation: { mutateAsync: vi.fn() },
  deleteCurrencyMutation: { mutateAsync: vi.fn() },
  deleteLanguageMutation: { mutateAsync: vi.fn() },
  toast: vi.fn(),
  useCountries: vi.fn(),
  useCurrencies: vi.fn(),
  useLanguages: vi.fn(),
}));

vi.mock('@/features/internationalization/hooks/useInternationalizationMutations', () => ({
  useDeleteCountryMutation: () => mocks.deleteCountryMutation,
  useDeleteCurrencyMutation: () => mocks.deleteCurrencyMutation,
  useDeleteLanguageMutation: () => mocks.deleteLanguageMutation,
}));

vi.mock('@/shared/hooks/use-i18n-queries', () => ({
  useCountries: () => mocks.useCountries(),
  useCurrencies: () => mocks.useCurrencies(),
  useLanguages: () => mocks.useLanguages(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: () => null,
}));

describe('InternationalizationContext', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.useCurrencies.mockReturnValue({
      data: [{ code: 'USD', id: 'currency-1', name: 'US Dollar' }],
      isLoading: false,
    });
    mocks.useCountries.mockReturnValue({
      data: [{ code: 'US', id: 'country-1', name: 'United States' }],
      isLoading: false,
    });
    mocks.useLanguages.mockReturnValue({
      data: [{ code: 'en', id: 'language-1', name: 'English' }],
      error: null,
      isLoading: false,
    });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useInternationalizationData())).toThrow(
      'useInternationalizationData must be used within an InternationalizationProvider'
    );
    expect(() => renderHook(() => useInternationalizationUi())).toThrow(
      'useInternationalizationUi must be used within an InternationalizationProvider'
    );
    expect(() => renderHook(() => useInternationalizationActions())).toThrow(
      'useInternationalizationActions must be used within an InternationalizationProvider'
    );
  });

  it('provides split data, ui, and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <InternationalizationProvider>{children}</InternationalizationProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useInternationalizationActions(),
        data: useInternationalizationData(),
        ui: useInternationalizationUi(),
      }),
      { wrapper }
    );

    expect(result.current.data).toMatchObject({
      countries: [{ code: 'US', id: 'country-1', name: 'United States' }],
      currencies: [{ code: 'USD', id: 'currency-1', name: 'US Dollar' }],
      filteredCountries: [{ code: 'US', id: 'country-1', name: 'United States' }],
      languages: [{ code: 'en', id: 'language-1', name: 'English' }],
      languagesError: null,
      languagesLoading: false,
      loadingCountries: false,
      loadingCurrencies: false,
    });
    expect(result.current.ui).toMatchObject({
      activeCountry: null,
      activeCurrency: null,
      activeLanguage: null,
      countrySearch: '',
      isCountryModalOpen: false,
      isCurrencyModalOpen: false,
      isLanguageModalOpen: false,
    });
    expect(result.current.actions.handleOpenCountryModal).toBeTypeOf('function');
    expect(result.current.actions.handleOpenCurrencyModal).toBeTypeOf('function');
    expect(result.current.actions.handleOpenLanguageModal).toBeTypeOf('function');
    expect(result.current.actions.confirmAction).toBeTypeOf('function');
  });
});
