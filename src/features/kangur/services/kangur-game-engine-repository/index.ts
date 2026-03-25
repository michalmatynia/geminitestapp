import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { localKangurGameEngineRepository } from './local-kangur-game-engine-repository';
import type {
  KangurGameEngineListInput,
  KangurGameEngineRepository,
} from './types';

export type { KangurGameEngineListInput, KangurGameEngineRepository } from './types';

const SERVICE = 'kangur.game-engine-repository';

export const getKangurGameEngineRepository = async (): Promise<KangurGameEngineRepository> => {
  const provider = 'local-registry';
  const repository = localKangurGameEngineRepository;

  return {
    listEngines: async (input?: KangurGameEngineListInput) => {
      try {
        return await repository.listEngines(input);
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: SERVICE,
          action: 'listEngines',
          provider,
          status: input?.status ?? null,
          surface: input?.surface ?? null,
          mechanic: input?.mechanic ?? null,
        });
        throw error;
      }
    },
  };
};
