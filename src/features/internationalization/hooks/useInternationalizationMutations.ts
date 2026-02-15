import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';

import { deleteCurrency, deleteCountry, deleteLanguage, saveCurrency, saveCountry, saveLanguage, type SaveCurrencyInput, type SaveCountryInput, type SaveLanguageInput } from '../api';

export function useDeleteCurrencyMutation(): UseMutationResult<void, Error, string> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: deleteCurrency,

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.currencies() });

    },

  });

}



export function useDeleteCountryMutation(): UseMutationResult<void, Error, string> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: deleteCountry,

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.countries() });

    },

  });

}



export function useDeleteLanguageMutation(): UseMutationResult<void, Error, string> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: deleteLanguage,

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.languages() });

    },

  });

}



export function useSaveCurrencyMutation(): UseMutationResult<CurrencyOption, Error, { id: string | undefined; data: SaveCurrencyInput }> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: ({ id, data }: { id: string | undefined; data: SaveCurrencyInput }) => saveCurrency(id, data),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.currencies() });

    },

  });

}



export function useSaveCountryMutation(): UseMutationResult<CountryOption, Error, { id: string | undefined; data: SaveCountryInput }> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: ({ id, data }: { id: string | undefined; data: SaveCountryInput }) => saveCountry(id, data),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.countries() });

    },

  });

}



export function useSaveLanguageMutation(): UseMutationResult<Language, Error, { id: string | undefined; data: SaveLanguageInput }> {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: ({ id, data }: { id: string | undefined; data: SaveLanguageInput }) => saveLanguage(id, data),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.internationalization.languages() });

    },

  });

}
