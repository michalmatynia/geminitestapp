import {
  createDefaultKangurGameEngines,
} from '@/features/kangur/games';
import type {
  KangurGameEngineDefinition,
} from '@/shared/contracts/kangur-games';

import type {
  KangurGameEngineListInput,
  KangurGameEngineRepository,
} from './types';

const filterEngines = (
  engines: KangurGameEngineDefinition[],
  input?: KangurGameEngineListInput
): KangurGameEngineDefinition[] => {
  let next = engines;
  const status = input?.status;
  const surface = input?.surface;
  const mechanic = input?.mechanic;

  if (status) {
    next = next.filter((engine) => engine.status === status);
  }

  if (surface) {
    next = next.filter((engine) => engine.surfaces.includes(surface));
  }

  if (mechanic) {
    next = next.filter((engine) => engine.mechanics.includes(mechanic));
  }

  return next;
};

export const localKangurGameEngineRepository: KangurGameEngineRepository = {
  async listEngines(input) {
    return filterEngines(createDefaultKangurGameEngines(), input);
  },
};
