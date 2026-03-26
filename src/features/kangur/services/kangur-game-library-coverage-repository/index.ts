import 'server-only';

import { createKangurGameLibraryCoverageGroups } from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';

import type { KangurGameLibraryCoverageRepository } from './types';

export type { KangurGameLibraryCoverageRepository } from './types';

const SERVICE = 'kangur.game-library-coverage-repository';

export const getKangurGameLibraryCoverageRepository =
  async (): Promise<KangurGameLibraryCoverageRepository> => {
    const provider = 'composite';

    return {
      listCoverage: async () => {
        try {
          const catalogRepository = await getKangurGameCatalogRepository();
          return createKangurGameLibraryCoverageGroups(
            await catalogRepository.listCatalog()
          );
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listCoverage',
            provider,
          });
          throw error;
        }
      },
    };
  };
