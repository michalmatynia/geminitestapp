'use client';

import { createDeleteMutation, createSaveMutation } from '@/shared/lib/mutation-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';
import type { SaveMutation, VoidMutation } from '@/shared/types/query-result-types';

import { 
  deleteCurrency, 
  deleteCountry, 
  deleteLanguage, 
  saveCurrency, 
  saveCountry, 
  saveLanguage, 
  type SaveCurrencyInput, 
  type SaveCountryInput, 
  type SaveLanguageInput 
} from '../api';

const i18nKeys = QUERY_KEYS.internationalization;

export function useDeleteCurrencyMutation(): VoidMutation<string> {
  return createDeleteMutation({
    deleteFn: deleteCurrency,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation(): VoidMutation<string> {
  return createDeleteMutation({
    deleteFn: deleteCountry,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation(): VoidMutation<string> {
  return createDeleteMutation({
    deleteFn: deleteLanguage,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation(): SaveMutation<CurrencyOption, SaveCurrencyInput> {
  return createSaveMutation({
    saveFn: saveCurrency,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation(): SaveMutation<CountryOption, SaveCountryInput> {
  return createSaveMutation({
    saveFn: saveCountry,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation(): SaveMutation<Language, SaveLanguageInput> {
  return createSaveMutation({
    saveFn: saveLanguage,
    invalidateFn: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}
