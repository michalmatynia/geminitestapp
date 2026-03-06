import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoKangurProgressRepository } from './mongo-kangur-progress-repository';
import { prismaKangurProgressRepository } from './prisma-kangur-progress-repository';
import type { KangurProgressRepository } from './types';

export type { KangurProgressRepository } from './types';

const KANGUR_PROGRESS_REPOSITORY_SERVICE = 'kangur.progress-repository';

export const getKangurProgressRepository = async (): Promise<KangurProgressRepository> => {
  const provider = await getAppDbProvider();
  const repository =
    provider === 'mongodb' ? mongoKangurProgressRepository : prismaKangurProgressRepository;

  return {
    getProgress: async (userKey) => {
      try {
        return await repository.getProgress(userKey);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_PROGRESS_REPOSITORY_SERVICE,
          action: 'getProgress',
          provider,
          userKey,
        });
        throw error;
      }
    },
    saveProgress: async (userKey, progress) => {
      try {
        return await repository.saveProgress(userKey, progress);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_PROGRESS_REPOSITORY_SERVICE,
          action: 'saveProgress',
          provider,
          userKey,
          totalXp: progress.totalXp,
          gamesPlayed: progress.gamesPlayed,
        });
        throw error;
      }
    },
  };
};
