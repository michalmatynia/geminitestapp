import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

import { mongoKangurScoreRepository } from './mongo-kangur-score-repository';
import { prismaKangurScoreRepository } from './prisma-kangur-score-repository';
import type { KangurScoreRepository } from './types';

export type { KangurScoreRepository, KangurScoreListInput } from './types';

export const getKangurScoreRepository = async (): Promise<KangurScoreRepository> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return mongoKangurScoreRepository;
  }
  return prismaKangurScoreRepository;
};
