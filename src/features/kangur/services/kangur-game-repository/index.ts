import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurGameRepository } from './mongo-kangur-game-repository';
import type { KangurGameListInput, KangurGameRepository } from './types';

export type { KangurGameListInput, KangurGameRepository } from './types';

const SERVICE = 'kangur.game-repository';

export const getKangurGameRepository = async (): Promise<KangurGameRepository> => {
  const provider = 'mongodb';
  const repository = mongoKangurGameRepository;

  return {
    listGames: async (input?: KangurGameListInput) => {
      try {
        return await repository.listGames(input);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'listGames',
          provider,
          subject: input?.subject ?? null,
          ageGroup: input?.ageGroup ?? null,
          status: input?.status ?? null,
          surface: input?.surface ?? null,
          lessonComponentId: input?.lessonComponentId ?? null,
        });
        throw error;
      }
    },
    replaceGames: async (games) => {
      try {
        return await repository.replaceGames(games);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'replaceGames',
          provider,
          count: games.length,
        });
        throw error;
      }
    },
    saveGame: async (game) => {
      try {
        await repository.saveGame(game);
        return;
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'saveGame',
          provider,
          gameId: game.id,
          engineId: game.engineId,
        });
        throw error;
      }
    },
    removeGame: async (gameId) => {
      try {
        await repository.removeGame(gameId);
        return;
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'removeGame',
          provider,
          gameId,
        });
        throw error;
      }
    },
  };
};
