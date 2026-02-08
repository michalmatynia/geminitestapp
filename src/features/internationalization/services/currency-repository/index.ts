import 'server-only';

import type { CurrencyRepository } from '@/features/internationalization/types/services/currency-repository';

import { getInternationalizationProvider } from '../internationalization-provider';
import { mongoCurrencyRepository } from './mongo-currency-repository';
import { prismaCurrencyRepository } from './prisma-currency-repository';

export const getCurrencyRepository = async (): Promise<CurrencyRepository> => {
  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    return mongoCurrencyRepository;
  }
  return prismaCurrencyRepository;
};
