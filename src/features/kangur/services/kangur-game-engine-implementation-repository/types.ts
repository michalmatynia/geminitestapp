import type {
  KangurGameEngineId,
  KangurGameEngineImplementation,
  KangurGameEngineImplementationOwnership,
} from '@/shared/contracts/kangur-games';

export type KangurGameEngineImplementationRepository = {
  listImplementations: (
    input?: {
      engineId?: KangurGameEngineId;
      ownership?: KangurGameEngineImplementationOwnership;
    }
  ) => Promise<KangurGameEngineImplementation[]>;
};
