import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCurrency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation(): VoidMutation<string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCountry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation(): VoidMutation<string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation(): SaveMutation<CurrencyOption, { id: string | undefined; data: SaveCurrencyInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: SaveCurrencyInput }) => saveCurrency(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation(): SaveMutation<CountryOption, { id: string | undefined; data: SaveCountryInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: SaveCountryInput }) => saveCountry(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation(): SaveMutation<Language, { id: string | undefined; data: SaveLanguageInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: SaveLanguageInput }) => saveLanguage(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}
