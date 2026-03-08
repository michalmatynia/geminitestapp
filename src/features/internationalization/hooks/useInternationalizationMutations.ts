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
import { createDeleteMutationV2, createSaveMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const i18nKeys = QUERY_KEYS.internationalization;
const I18N_METADATA_BASE = '/api/v2/metadata';
const CURRENCIES_ENDPOINT = `${I18N_METADATA_BASE}/currencies`;
const COUNTRIES_ENDPOINT = `${I18N_METADATA_BASE}/countries`;
const LANGUAGES_ENDPOINT = `${I18N_METADATA_BASE}/languages`;

export function useDeleteCurrencyMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.currencies();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`${CURRENCIES_ENDPOINT}/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCurrencyMutation',
      operation: 'delete',
      resource: 'internationalization.currencies',
      domain: 'internationalization',
      tags: ['internationalization', 'currencies', 'delete'],
      description: 'Deletes internationalization currencies.'},
    invalidateKeys: [i18nKeys.currencies()],
  });
}

export function useDeleteCountryMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.countries();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`${COUNTRIES_ENDPOINT}/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCountryMutation',
      operation: 'delete',
      resource: 'internationalization.countries',
      domain: 'internationalization',
      tags: ['internationalization', 'countries', 'delete'],
      description: 'Deletes internationalization countries.'},
    invalidateKeys: [i18nKeys.countries()],
  });
}

export function useDeleteLanguageMutation(): DeleteMutation<void, string> {
  const mutationKey = i18nKeys.languages();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`${LANGUAGES_ENDPOINT}/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteLanguageMutation',
      operation: 'delete',
      resource: 'internationalization.languages',
      domain: 'internationalization',
      tags: ['internationalization', 'languages', 'delete'],
      description: 'Deletes internationalization languages.'},
    invalidateKeys: [i18nKeys.languages()],
  });
}

export function useSaveCurrencyMutation(): SaveMutation<
  CurrencyOption,
  { id?: string; data: SaveCurrencyInput }
  > {
  const mutationKey = i18nKeys.currencies();
  return createSaveMutationV2<CurrencyOption, { id?: string; data: SaveCurrencyInput }>({
    createFn: (variables) => api.post<CurrencyOption>(CURRENCIES_ENDPOINT, variables),
    updateFn: (id, variables) => api.put<CurrencyOption>(`${CURRENCIES_ENDPOINT}/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCurrencyMutation',
      operation: 'action',
      resource: 'internationalization.currencies',
      domain: 'internationalization',
      tags: ['internationalization', 'currencies', 'save'],
      description: 'Runs internationalization currencies.'},
    invalidateKeys: [i18nKeys.currencies()],
  });
}

export function useSaveCountryMutation(): SaveMutation<
  CountryOption,
  { id?: string; data: SaveCountryInput }
  > {
  const mutationKey = i18nKeys.countries();
  return createSaveMutationV2<CountryOption, { id?: string; data: SaveCountryInput }>({
    createFn: (variables) => api.post<CountryOption>(COUNTRIES_ENDPOINT, variables),
    updateFn: (id, variables) => api.put<CountryOption>(`${COUNTRIES_ENDPOINT}/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCountryMutation',
      operation: 'action',
      resource: 'internationalization.countries',
      domain: 'internationalization',
      tags: ['internationalization', 'countries', 'save'],
      description: 'Runs internationalization countries.'},
    invalidateKeys: [i18nKeys.countries()],
  });
}

export function useSaveLanguageMutation(): SaveMutation<
  Language,
  { id?: string; data: SaveLanguageInput }
  > {
  const mutationKey = i18nKeys.languages();
  return createSaveMutationV2<Language, { id?: string; data: SaveLanguageInput }>({
    createFn: (variables) => api.post<Language>(LANGUAGES_ENDPOINT, variables),
    updateFn: (id, variables) => api.put<Language>(`${LANGUAGES_ENDPOINT}/${id}`, variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveLanguageMutation',
      operation: 'action',
      resource: 'internationalization.languages',
      domain: 'internationalization',
      tags: ['internationalization', 'languages', 'save'],
      description: 'Runs internationalization languages.'},
    invalidateKeys: [i18nKeys.languages()],
  });
}
