import 'server-only';

import type {
  CurrencyRepository,
  InternationalizationProvider,
} from '@/shared/contracts/internationalization';

import { getInternationalizationProvider } from '../internationalization-provider';
import { mongoCurrencyRepository } from './mongo-currency-repository';
import { prismaCurrencyRepository } from './prisma-currency-repository';

export const getCurrencyRepository = async (
  providerOverride?: InternationalizationProvider
): Promise<CurrencyRepository> => {
  const provider = providerOverride ?? (await getInternationalizationProvider());
  if (provider === 'mongodb') {
    return mongoCurrencyRepository;
  }
  return prismaCurrencyRepository;
};
