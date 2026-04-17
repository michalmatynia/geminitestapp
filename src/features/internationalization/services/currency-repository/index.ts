import 'server-only';

import type {
  CurrencyRepository,
  InternationalizationProvider,
} from '@/shared/contracts/internationalization';

import { mongoCurrencyRepository } from './mongo-currency-repository';

export const getCurrencyRepository = (
  _providerOverride?: InternationalizationProvider
): CurrencyRepository => {
  return mongoCurrencyRepository;
};
