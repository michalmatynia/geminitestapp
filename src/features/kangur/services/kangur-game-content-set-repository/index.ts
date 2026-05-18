import 'server-only';

/**
 * Kangur Game Content Set Repository
 *
 * This service provides the repository interface for managing Kangur game content sets.
 * It abstracts persistence for content set configurations, facilitating retrieval
 * and bulk management of game-specific content assets.
 */

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurGameContentSetRepository } from './mongo-kangur-game-content-set-repository';
import type {
  KangurGameContentSetListInput,
  KangurGameContentSetRepository,
} from './types';

export type {
  KangurGameContentSetListInput,
  KangurGameContentSetRepository,
} from './types';

const SERVICE = 'kangur.game-content-set-repository';

export const getKangurGameContentSetRepository =
  async (): Promise<KangurGameContentSetRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurGameContentSetRepository;

    return {
      listContentSets: async (input?: KangurGameContentSetListInput) => {
        try {
          return await repository.listContentSets(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listContentSets',
            provider,
            contentSetId: input?.contentSetId ?? null,
            gameId: input?.gameId ?? null,
          });
          throw error;
        }
      },
      replaceContentSetsForGame: async (gameId, contentSets) => {
        try {
          return await repository.replaceContentSetsForGame(gameId, contentSets);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceContentSetsForGame',
            provider,
            count: contentSets.length,
            gameId,
          });
          throw error;
        }
      },
    };
  };
