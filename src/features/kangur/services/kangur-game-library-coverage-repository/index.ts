import 'server-only';

import { createKangurGameLibraryCoverage } from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';

import type { KangurGameLibraryCoverageRepository } from './types';

export type { KangurGameLibraryCoverageRepository } from './types';

const SERVICE = 'kangur.game-library-coverage-repository';

export const getKangurGameLibraryCoverageRepository =
  async (): Promise<KangurGameLibraryCoverageRepository> => {
    const provider = 'composite';

    return {
      getCoverage: async () => {
        try {
          const catalogRepository = await getKangurGameCatalogRepository();
          return createKangurGameLibraryCoverage(
            await catalogRepository.listCatalog()
          );
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'getCoverage',
            provider,
          });
          throw error;
        }
      },
    };
  };
