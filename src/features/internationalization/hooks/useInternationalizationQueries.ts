'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { i18nKeys } from '@/shared/lib/query-key-exports';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';

import { getCurrencies, getCountries, getLanguages } from '../api';

export function useCurrencies(): UseQueryResult<CurrencyOption[], Error> {
  return useQuery({
    queryKey: i18nKeys.currencies,
    queryFn: getCurrencies,
  });
}

export function useCountries(): UseQueryResult<CountryOption[], Error> {
  return useQuery({
    queryKey: i18nKeys.countries,
    queryFn: getCountries,
  });
}

export function useLanguages(): UseQueryResult<Language[], Error> {
  return useQuery({
    queryKey: i18nKeys.languages,
    queryFn: getLanguages,
  });
}
