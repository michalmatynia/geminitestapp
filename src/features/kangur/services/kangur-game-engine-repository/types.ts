import type {
  KangurGameEngineDefinition,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
} from '@/shared/contracts/kangur-games';

export type KangurGameEngineListInput = {
  status?: KangurGameStatus;
  surface?: KangurGameSurface;
  mechanic?: KangurGameMechanic;
};

export type KangurGameEngineRepository = {
  listEngines: (input?: KangurGameEngineListInput) => Promise<KangurGameEngineDefinition[]>;
};
