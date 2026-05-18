import 'server-only';

/**
 * Kangur Progress Repository
 *
 * This service provides the repository interface for managing Kangur learner progress.
 * It abstracts persistence for progress data (e.g., XP, games played), facilitating
 * retrieval and updates across the platform.
 */

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

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
