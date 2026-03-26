import {
  createDefaultKangurGameEngineImplementations,
  filterKangurGameEngineImplementations,
} from '@/features/kangur/games';

import type {
  KangurGameEngineImplementationRepository,
} from './types';

export const localKangurGameEngineImplementationRepository: KangurGameEngineImplementationRepository =
  {
    async listImplementations(input) {
      return filterKangurGameEngineImplementations(
        createDefaultKangurGameEngineImplementations(),
        input
      );
    },
  };
