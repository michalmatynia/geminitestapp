import type {
  KangurGameInstance,
  KangurGameInstanceId,
} from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';

export type KangurGameInstanceListInput = {
  enabledOnly?: boolean;
  gameId?: KangurGameId;
  instanceId?: KangurGameInstanceId;
};

export type KangurGameInstanceRepository = {
  listInstances: (input?: KangurGameInstanceListInput) => Promise<KangurGameInstance[]>;
  replaceInstancesForGame: (
    gameId: KangurGameId,
    instances: KangurGameInstance[]
  ) => Promise<KangurGameInstance[]>;
};
