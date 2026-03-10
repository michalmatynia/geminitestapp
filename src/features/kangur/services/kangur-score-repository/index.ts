import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { mongoKangurScoreRepository } from './mongo-kangur-score-repository';
import { prismaKangurScoreRepository } from './prisma-kangur-score-repository';

import type { KangurScoreRepository } from './types';

export type { KangurScoreRepository, KangurScoreListInput } from './types';

const KANGUR_SCORE_REPOSITORY_SERVICE = 'kangur.score-repository';

export const getKangurScoreRepository = async (): Promise<KangurScoreRepository> => {
  const provider = await getAppDbProvider();
  const repository =
    provider === 'mongodb' ? mongoKangurScoreRepository : prismaKangurScoreRepository;

  return {
    createScore: async (input) => {
      try {
        return await repository.createScore(input);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_SCORE_REPOSITORY_SERVICE,
          action: 'createScore',
          provider,
          operation: input.operation,
          score: input.score,
          totalQuestions: input.total_questions,
          correctAnswers: input.correct_answers,
        });
        throw error;
      }
    },
    listScores: async (input) => {
      try {
        return await repository.listScores(input);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: KANGUR_SCORE_REPOSITORY_SERVICE,
          action: 'listScores',
          provider,
          sort: input?.sort ?? null,
          limit: input?.limit ?? null,
          hasFilters: Boolean(input?.filters),
          filterKeys: input?.filters ? Object.keys(input.filters) : [],
        });
        throw error;
      }
    },
  };
};
