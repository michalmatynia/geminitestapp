import 'server-only';

import type {
  CurrencyRepository,
  InternationalizationProvider,
} from '@/shared/contracts/internationalization';

import { mongoCurrencyRepository } from './mongo-currency-repository';

export const getCurrencyRepository = async (
  providerOverride?: InternationalizationProvider
): Promise<CurrencyRepository> => {
  void providerOverride;
  return mongoCurrencyRepository;
};
