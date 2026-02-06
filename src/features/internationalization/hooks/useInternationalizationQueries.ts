'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { CurrencyOption, CountryOption, Language } from '@/shared/types/internationalization';

import { getCurrencies, getCountries, getLanguages } from '../api';

export function useCurrencies(): UseQueryResult<CurrencyOption[], Error> {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: getCurrencies,
  });
}

export function useCountries(): UseQueryResult<CountryOption[], Error> {
  return useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
  });
}

export function useLanguages(): UseQueryResult<Language[], Error> {
  return useQuery({
    queryKey: ['languages'],
    queryFn: getLanguages,
  });
}