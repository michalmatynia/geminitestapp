import 'server-only';

import {
  createKangurGameVariantCatalogEntries,
  createKangurGamesLibraryOverview,
  filterKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';

import type {
  KangurGameLibraryOverviewListInput,
  KangurGameLibraryOverviewRepository,
} from './types';

export type {
  KangurGameLibraryOverviewListInput,
  KangurGameLibraryOverviewRepository,
} from './types';

const SERVICE = 'kangur.game-library-overview-repository';

export const getKangurGameLibraryOverviewRepository =
  async (): Promise<KangurGameLibraryOverviewRepository> => {
    const provider = 'composite';

    return {
      getOverview: async (input?: KangurGameLibraryOverviewListInput) => {
        try {
          const catalogRepository = await getKangurGameCatalogRepository();
          const catalogEntries = await catalogRepository.listCatalog(input);
          const variantEntries = filterKangurGameVariantCatalogEntries(
            createKangurGameVariantCatalogEntries(catalogEntries),
            {
              variantSurface: input?.variantSurface,
              variantStatus: input?.variantStatus,
              launchableOnly: input?.launchableOnly,
            }
          );

          return createKangurGamesLibraryOverview(catalogEntries, variantEntries);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'getOverview',
            provider,
            subject: input?.subject ?? null,
            ageGroup: input?.ageGroup ?? null,
            gameStatus: input?.gameStatus ?? null,
            surface: input?.surface ?? null,
            lessonComponentId: input?.lessonComponentId ?? null,
            mechanic: input?.mechanic ?? null,
            engineId: input?.engineId ?? null,
            engineCategory: input?.engineCategory ?? null,
            implementationOwnership: input?.implementationOwnership ?? null,
            variantSurface: input?.variantSurface ?? null,
            variantStatus: input?.variantStatus ?? null,
            launchableOnly: input?.launchableOnly ?? false,
          });
          throw error;
        }
      },
    };
  };
