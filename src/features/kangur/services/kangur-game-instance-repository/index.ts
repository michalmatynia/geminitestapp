import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { mongoKangurGameInstanceRepository } from './mongo-kangur-game-instance-repository';
import type {
  KangurGameInstanceListInput,
  KangurGameInstanceRepository,
} from './types';

export type {
  KangurGameInstanceListInput,
  KangurGameInstanceRepository,
} from './types';

const SERVICE = 'kangur.game-instance-repository';

export const getKangurGameInstanceRepository =
  async (): Promise<KangurGameInstanceRepository> => {
    const provider = 'mongodb';
    const repository = mongoKangurGameInstanceRepository;

    return {
      listInstances: async (input?: KangurGameInstanceListInput) => {
        try {
          return await repository.listInstances(input);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'listInstances',
            provider,
            enabledOnly: input?.enabledOnly ?? null,
            gameId: input?.gameId ?? null,
            instanceId: input?.instanceId ?? null,
          });
          throw error;
        }
      },
      replaceInstancesForGame: async (gameId, instances) => {
        try {
          return await repository.replaceInstancesForGame(gameId, instances);
        } catch (error) {
          void ErrorSystem.captureException(error, {
            service: SERVICE,
            action: 'replaceInstancesForGame',
            provider,
            gameId,
            count: instances.length,
          });
          throw error;
        }
      },
    };
  };
