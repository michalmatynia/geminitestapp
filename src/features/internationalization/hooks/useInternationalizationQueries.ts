'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';

import { getCurrencies, getCountries, getLanguages } from '../api';

export function useCurrencies(): UseQueryResult<CurrencyOption[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.internationalization.currencies,
    queryFn: getCurrencies,
  });
}

export function useCountries(): UseQueryResult<CountryOption[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.internationalization.countries,
    queryFn: getCountries,
  });
}

export function useLanguages(): UseQueryResult<Language[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.internationalization.languages,
    queryFn: getLanguages,
  });
}
