'use client';

import { createListQuery } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';
import type { ListQuery } from '@/shared/types/query-result-types';

import { getCurrencies, getCountries, getLanguages } from '../api';

const i18nKeys = QUERY_KEYS.internationalization;

export function useCurrencies(): ListQuery<CurrencyOption> {
  return createListQuery({
    queryKey: i18nKeys.currencies(),
    queryFn: getCurrencies,
  });
}

export function useCountries(): ListQuery<CountryOption> {
  return createListQuery({
    queryKey: i18nKeys.countries(),
    queryFn: getCountries,
  });
}

export function useLanguages(): ListQuery<Language> {
  return createListQuery({
    queryKey: i18nKeys.languages(),
    queryFn: getLanguages,
  });
}
