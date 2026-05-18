import 'server-only';

/**
 * Kangur Score Repository
 *
 * This service provides the repository interface for managing Kangur platform scores.
 * It abstracts persistence for score data (e.g., operation results, correct answers),
 * facilitating score creation and retrieval for leaderboards and progress tracking.
 */

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurScoreRepository } from './mongo-kangur-score-repository';

import type { KangurScoreRepository } from './types';

export type { KangurScoreRepository, KangurScoreListInput } from './types';

const KANGUR_SCORE_REPOSITORY_SERVICE = 'kangur.score-repository';

export const getKangurScoreRepository = async (): Promise<KangurScoreRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurScoreRepository;

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
