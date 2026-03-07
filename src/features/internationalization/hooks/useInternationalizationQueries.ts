import type {
  CurrencyOption,
  CountryOption,
  Language,
} from '@/shared/contracts/internationalization';
import type { ListQuery } from '@/shared/contracts/ui';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { getCurrencies, getCountries, getLanguages } from '../api';

const i18nKeys = QUERY_KEYS.internationalization;

export function useCurrencies(): ListQuery<CurrencyOption> {
  const queryKey = i18nKeys.currencies();
  return createListQueryV2({
    queryKey,
    queryFn: getCurrencies,
    meta: {
      source: 'internationalization.hooks.useCurrencies',
      operation: 'list',
      resource: 'internationalization.currencies',
      domain: 'internationalization',
      tags: ['internationalization', 'currencies'],
    },
  });
}

export function useCountries(): ListQuery<CountryOption> {
  const queryKey = i18nKeys.countries();
  return createListQueryV2({
    queryKey,
    queryFn: getCountries,
    meta: {
      source: 'internationalization.hooks.useCountries',
      operation: 'list',
      resource: 'internationalization.countries',
      domain: 'internationalization',
      tags: ['internationalization', 'countries'],
    },
  });
}

export function useLanguages(): ListQuery<Language> {
  const queryKey = i18nKeys.languages();
  return createListQueryV2({
    queryKey,
    queryFn: getLanguages,
    meta: {
      source: 'internationalization.hooks.useLanguages',
      operation: 'list',
      resource: 'internationalization.languages',
      domain: 'internationalization',
      tags: ['internationalization', 'languages'],
    },
  });
}
