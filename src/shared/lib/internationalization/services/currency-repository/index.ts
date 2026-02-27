import 'server-only';


import type { CurrencyRepository } from '@/shared/contracts/internationalization';

import {
  getInternationalizationProvider,
  type InternationalizationProvider,
} from '../internationalization-provider';
import { mongoCurrencyRepository } from './mongo-currency-repository';
import { prismaCurrencyRepository } from './prisma-currency-repository';


export const getCurrencyRepository = async (
  providerOverride?: InternationalizationProvider
): Promise<CurrencyRepository> => {
  const provider = providerOverride ?? await getInternationalizationProvider();
  if (provider === 'mongodb') {
    return mongoCurrencyRepository;
  }
  return prismaCurrencyRepository;
};
