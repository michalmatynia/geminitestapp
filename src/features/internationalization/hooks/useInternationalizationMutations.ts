'use client';

import { useQueryClient } from '@tanstack/react-query';

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
import { createDeleteMutationV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const i18nKeys = QUERY_KEYS.internationalization;

export function useDeleteCurrencyMutation(): DeleteMutation<void, string> {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.currencies();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/currencies/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCurrencyMutation',
      operation: 'delete',
      resource: 'internationalization.currencies',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'currencies', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useDeleteCountryMutation(): DeleteMutation<void, string> {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.countries();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/countries/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteCountryMutation',
      operation: 'delete',
      resource: 'internationalization.countries',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'countries', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useDeleteLanguageMutation(): DeleteMutation<void, string> {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.languages();
  return createDeleteMutationV2<void, string>({
    mutationFn: (id) => api.delete<void>(`/api/languages/${id}`),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useDeleteLanguageMutation',
      operation: 'delete',
      resource: 'internationalization.languages',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'languages', 'delete'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useSaveCurrencyMutation(): SaveMutation<
  CurrencyOption,
  { id?: string; data: SaveCurrencyInput }
  > {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.currencies();
  return createMutationV2<CurrencyOption, { id?: string; data: SaveCurrencyInput }>({
    mutationFn: (variables) =>
      variables.id
        ? api.put<CurrencyOption>(`/api/currencies/${variables.id}`, variables)
        : api.post<CurrencyOption>('/api/currencies', variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCurrencyMutation',
      operation: 'action',
      resource: 'internationalization.currencies',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'currencies', 'save'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.currencies() });
    },
  });
}

export function useSaveCountryMutation(): SaveMutation<
  CountryOption,
  { id?: string; data: SaveCountryInput }
  > {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.countries();
  return createMutationV2<CountryOption, { id?: string; data: SaveCountryInput }>({
    mutationFn: (variables) =>
      variables.id
        ? api.put<CountryOption>(`/api/countries/${variables.id}`, variables)
        : api.post<CountryOption>('/api/countries', variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveCountryMutation',
      operation: 'action',
      resource: 'internationalization.countries',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'countries', 'save'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.countries() });
    },
  });
}

export function useSaveLanguageMutation(): SaveMutation<
  Language,
  { id?: string; data: SaveLanguageInput }
  > {
  const queryClient = useQueryClient();
  const mutationKey = i18nKeys.languages();
  return createMutationV2<Language, { id?: string; data: SaveLanguageInput }>({
    mutationFn: (variables) =>
      variables.id
        ? api.put<Language>(`/api/languages/${variables.id}`, variables)
        : api.post<Language>('/api/languages', variables),
    mutationKey,
    meta: {
      source: 'i18n.hooks.useSaveLanguageMutation',
      operation: 'action',
      resource: 'internationalization.languages',
      domain: 'global',
      mutationKey,
      tags: ['internationalization', 'languages', 'save'],
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}
