'use client';

import { i18nKeys } from '@/shared/lib/query-key-exports';
import { createListQuery } from '@/shared/lib/query-factories';
import type { CurrencyOption, CountryOption, Language } from '@/shared/types/domain/internationalization';
import type { ListQuery } from '@/shared/types/query-result-types';

import { getCurrencies, getCountries, getLanguages } from '../api';

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
