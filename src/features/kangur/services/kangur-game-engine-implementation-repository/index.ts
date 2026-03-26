import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { localKangurGameEngineImplementationRepository } from './local-kangur-game-engine-implementation-repository';
import type {
  KangurGameEngineImplementationRepository,
} from './types';

export type {
  KangurGameEngineImplementationRepository,
} from './types';

const SERVICE = 'kangur.game-engine-implementation-repository';

export const getKangurGameEngineImplementationRepository =
  async (): Promise<KangurGameEngineImplementationRepository> => {
    const provider = 'local-registry';
    const repository = localKangurGameEngineImplementationRepository;

    return {
      listImplementations: async (input) => {
        try {
          return await repository.listImplementations(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listImplementations',
            provider,
            engineId: input?.engineId ?? null,
            ownership: input?.ownership ?? null,
          });
          throw error;
        }
      },
    };
  };
