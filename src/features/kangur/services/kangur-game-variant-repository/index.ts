import 'server-only';

import {
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';

import type {
  KangurGameVariantListInput,
  KangurGameVariantRepository,
} from './types';

export type { KangurGameVariantListInput, KangurGameVariantRepository } from './types';

const SERVICE = 'kangur.game-variant-repository';

export const getKangurGameVariantRepository = async (): Promise<KangurGameVariantRepository> => {
  const provider = 'catalog';

  return {
    listVariants: async (input?: KangurGameVariantListInput) => {
      try {
        const catalogRepository = await getKangurGameCatalogRepository();
        const catalogEntries = await catalogRepository.listCatalog({
          subject: input?.subject,
          ageGroup: input?.ageGroup,
          gameStatus: input?.gameStatus,
          surface: input?.surface,
          lessonComponentId: input?.lessonComponentId,
          mechanic: input?.mechanic,
          engineId: input?.engineId,
          engineCategory: input?.engineCategory,
          implementationOwnership: input?.implementationOwnership,
          launchableOnly: input?.launchableOnly,
        });

        return filterKangurGameVariantCatalogEntries(
          createKangurGameVariantCatalogEntries(catalogEntries),
          {
            variantSurface: input?.variantSurface,
            variantStatus: input?.variantStatus,
            launchableOnly: input?.launchableOnly,
          }
        );
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'listVariants',
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
