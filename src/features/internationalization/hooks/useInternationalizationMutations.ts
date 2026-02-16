'use client';

import { createDeleteMutation, createSaveMutation } from '@/shared/lib/api-hooks';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';

import type { 
  SaveCurrencyInput, 
  SaveCountryInput, 
  SaveLanguageInput 
} from '../api';

const i18nKeys = QUERY_KEYS.internationalization;

export function useDeleteCurrencyMutation() {
  return createDeleteMutation<void, string>({
    endpoint: (id) => `/api/currencies/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation() {
  return createDeleteMutation<void, string>({
    endpoint: (id) => `/api/countries/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation() {
  return createDeleteMutation<void, string>({
    endpoint: (id) => `/api/languages/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation() {
  return createSaveMutation<CurrencyOption, { id?: string; data: SaveCurrencyInput }>({
    createEndpoint: '/api/currencies',
    updateEndpoint: ({ id }) => `/api/currencies/${id}`,
    updateMethod: 'PUT',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation() {
  return createSaveMutation<CountryOption, { id?: string; data: SaveCountryInput }>({
    createEndpoint: '/api/countries',
    updateEndpoint: ({ id }) => `/api/countries/${id}`,
    updateMethod: 'PUT',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation() {
  return createSaveMutation<Language, { id?: string; data: SaveLanguageInput }>({
    createEndpoint: '/api/languages',
    updateEndpoint: ({ id }) => `/api/languages/${id}`,
    updateMethod: 'PUT',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

