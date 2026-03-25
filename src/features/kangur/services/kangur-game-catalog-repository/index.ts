import 'server-only';

import {
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
} from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameEngineRepository } from '@/features/kangur/services/kangur-game-engine-repository';
import { getKangurGameRepository } from '@/features/kangur/services/kangur-game-repository';

import type {
  KangurGameCatalogListInput,
  KangurGameCatalogRepository,
} from './types';

export type { KangurGameCatalogListInput, KangurGameCatalogRepository } from './types';

const SERVICE = 'kangur.game-catalog-repository';

export const getKangurGameCatalogRepository = async (): Promise<KangurGameCatalogRepository> => {
  const provider = 'composite';

  return {
    listCatalog: async (input?: KangurGameCatalogListInput) => {
      try {
        const [gameRepository, engineRepository] = await Promise.all([
          getKangurGameRepository(),
          getKangurGameEngineRepository(),
        ]);

        const [games, engines] = await Promise.all([
          gameRepository.listGames({
            subject: input?.subject,
            ageGroup: input?.ageGroup,
            status: input?.gameStatus,
            surface: input?.surface,
            lessonComponentId: input?.lessonComponentId,
          }),
          engineRepository.listEngines(),
        ]);

        return filterKangurGameCatalogEntries(
          createKangurGameCatalogEntries({ games, engines }),
          input
        );
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'listCatalog',
          provider,
          subject: input?.subject ?? null,
          ageGroup: input?.ageGroup ?? null,
          gameStatus: input?.gameStatus ?? null,
          surface: input?.surface ?? null,
          lessonComponentId: input?.lessonComponentId ?? null,
          mechanic: input?.mechanic ?? null,
          engineId: input?.engineId ?? null,
          launchableOnly: input?.launchableOnly ?? false,
        });
        throw error;
      }
    },
  };
};
