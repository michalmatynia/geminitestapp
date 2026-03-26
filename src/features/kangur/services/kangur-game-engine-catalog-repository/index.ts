import 'server-only';

import {
  createKangurGameEngineCatalogEntries,
  getKangurGameEngineCatalogFacets,
} from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';
import { getKangurGameEngineImplementationRepository } from '@/features/kangur/services/kangur-game-engine-implementation-repository';
import { getKangurGameVariantRepository } from '@/features/kangur/services/kangur-game-variant-repository';

import type {
  KangurGameEngineCatalogListInput,
  KangurGameEngineCatalogRepository,
} from './types';

export type {
  KangurGameEngineCatalogListInput,
  KangurGameEngineCatalogRepository,
} from './types';

const SERVICE = 'kangur.game-engine-catalog-repository';

export const getKangurGameEngineCatalogRepository =
  async (): Promise<KangurGameEngineCatalogRepository> => {
    const provider = 'composite';
    const listCatalog = async (
      input?: KangurGameEngineCatalogListInput
    ) => {
      const [catalogRepository, variantRepository, implementationRepository] =
        await Promise.all([
          getKangurGameCatalogRepository(),
          getKangurGameVariantRepository(),
          getKangurGameEngineImplementationRepository(),
        ]);

      const [catalogEntries, variantEntries, implementations] = await Promise.all([
        catalogRepository.listCatalog(input),
        variantRepository.listVariants(input),
        implementationRepository.listImplementations(),
      ]);

      return createKangurGameEngineCatalogEntries({
        catalogEntries,
        variantEntries,
        implementations,
      });
    };

    return {
      listCatalog: async (input?: KangurGameEngineCatalogListInput) => {
        try {
          return await listCatalog(input);
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
            engineCategory: input?.engineCategory ?? null,
            implementationOwnership: input?.implementationOwnership ?? null,
            variantSurface: input?.variantSurface ?? null,
            variantStatus: input?.variantStatus ?? null,
            launchableOnly: input?.launchableOnly ?? false,
          });
          throw error;
        }
      },
      listCatalogFacets: async (input?: KangurGameEngineCatalogListInput) => {
        try {
          return getKangurGameEngineCatalogFacets(await listCatalog(input));
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listCatalogFacets',
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
