import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoKangurProgressRepository } from './mongo-kangur-progress-repository';

import type { KangurProgressRepository } from './types';

export type { KangurProgressRepository } from './types';

const KANGUR_PROGRESS_REPOSITORY_SERVICE = 'kangur.progress-repository';

export const getKangurProgressRepository = async (): Promise<KangurProgressRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurProgressRepository;

  return {
    getProgress: async (userKey) => {
      try {
        return await repository.getProgress(userKey);
      } catch (error) {
        void ErrorSystem.captureException(error);
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
        void ErrorSystem.captureException(error);
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
