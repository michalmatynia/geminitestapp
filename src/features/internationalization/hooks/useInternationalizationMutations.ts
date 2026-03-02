'use client';

import type {
  CurrencyOption,
  CountryOption,
  Language,
  SaveCurrencyInput,
  SaveCountryInput,
  SaveLanguageInput,
} from '@/shared/contracts/internationalization';
import type { DeleteMutation, SaveMutation } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createSaveMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const i18nKeys = QUERY_KEYS.internationalization;

export function useDeleteCurrencyMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.currencies();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/currencies/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCurrencyMutation',
      operation: 'delete',
      resource: 'internationalization.currencies',
      domain: 'internationalization',
      tags: ['internationalization', 'currencies', 'delete'],
    },
    invalidateKeys: [i18nKeys.currencies()],
  });
}

export function useDeleteCountryMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.countries();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/countries/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCountryMutation',
      operation: 'delete',
      resource: 'internationalization.countries',
      domain: 'internationalization',
      tags: ['internationalization', 'countries', 'delete'],
    },
    invalidateKeys: [i18nKeys.countries()],
  });
}

export function useDeleteLanguageMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.languages();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/languages/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteLanguageMutation',
      operation: 'delete',
      resource: 'internationalization.languages',
      domain: 'internationalization',
      tags: ['internationalization', 'languages', 'delete'],
    },
    invalidateKeys: [i18nKeys.languages()],
  });
}

export function useSaveCurrencyMutation(): SaveMutation<
  CurrencyOption,
  { id?: string; data: SaveCurrencyInput }
  > {
  const mutationKey = i18nKeys.currencies();
  return createSaveMutationV2<CurrencyOption, { id?: string; data: SaveCurrencyInput }>({
    createFn: (variables) => api.post<CurrencyOption>('/api/currencies', variables),
    updateFn: (id, variables) => api.put<CurrencyOption>(`/api/currencies/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCurrencyMutation',
      operation: 'action',
      resource: 'internationalization.currencies',
      domain: 'internationalization',
      tags: ['internationalization', 'currencies', 'save'],
    },
    invalidateKeys: [i18nKeys.currencies()],
  });
}

export function useSaveCountryMutation(): SaveMutation<
  CountryOption,
  { id?: string; data: SaveCountryInput }
  > {
  const mutationKey = i18nKeys.countries();
  return createSaveMutationV2<CountryOption, { id?: string; data: SaveCountryInput }>({
    createFn: (variables) => api.post<CountryOption>('/api/countries', variables),
    updateFn: (id, variables) => api.put<CountryOption>(`/api/countries/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCountryMutation',
      operation: 'action',
      resource: 'internationalization.countries',
      domain: 'internationalization',
      tags: ['internationalization', 'countries', 'save'],
    },
    invalidateKeys: [i18nKeys.countries()],
  });
}

export function useSaveLanguageMutation(): SaveMutation<
  Language,
  { id?: string; data: SaveLanguageInput }
  > {
  const mutationKey = i18nKeys.languages();
  return createSaveMutationV2<Language, { id?: string; data: SaveLanguageInput }>({
    createFn: (variables) => api.post<Language>('/api/languages', variables),
    updateFn: (id, variables) => api.put<Language>(`/api/languages/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveLanguageMutation',
      operation: 'action',
      resource: 'internationalization.languages',
      domain: 'internationalization',
      tags: ['internationalization', 'languages', 'save'],
    },
    invalidateKeys: [i18nKeys.languages()],
  });
}
