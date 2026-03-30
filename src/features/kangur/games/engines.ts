import type {
  KangurGameEngineDefinition,
  KangurGameEngineId,
} from '@/shared/contracts/kangur-games';

import { KANGUR_ADULT_LEARNING_GAME_ENGINES } from './engines/adult-learning';
import { KANGUR_EARLY_LEARNING_GAME_ENGINES } from './engines/early-learning';
import { cloneKangurGameEngineDefinition } from './engines/factories';
import { KANGUR_FOUNDATIONAL_GAME_ENGINES } from './engines/foundational';

export const KANGUR_DEFAULT_GAME_ENGINES: readonly KangurGameEngineDefinition[] = [
  ...KANGUR_FOUNDATIONAL_GAME_ENGINES,
  ...KANGUR_EARLY_LEARNING_GAME_ENGINES,
  ...KANGUR_ADULT_LEARNING_GAME_ENGINES,
];

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const createDefaultKangurGameEngines = (): KangurGameEngineDefinition[] =>
  KANGUR_DEFAULT_GAME_ENGINES.map(cloneKangurGameEngineDefinition);

export const KANGUR_GAME_ENGINE_LIBRARY = Object.freeze(
  createDefaultKangurGameEngines().reduce<
    Record<KangurGameEngineId, KangurGameEngineDefinition>
  >((acc, engine) => {
    acc[engine.id] = engine;
    return acc;
  }, {} as Record<KangurGameEngineId, KangurGameEngineDefinition>)
);

export const KANGUR_GAME_ENGINE_ORDER = Object.freeze(
  Object.values(KANGUR_GAME_ENGINE_LIBRARY)
    .slice()
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
    )
    .map((engine) => engine.id)
);

export const KANGUR_GAME_ENGINE_LIBRARY_LIST = Object.freeze(
  KANGUR_GAME_ENGINE_ORDER.map((engineId) => KANGUR_GAME_ENGINE_LIBRARY[engineId]).filter(
    isDefined
  )
);

export const getKangurGameEngineDefinition = (
  engineId: KangurGameEngineId
): KangurGameEngineDefinition => {
  const engine = KANGUR_GAME_ENGINE_LIBRARY[engineId];
  if (!engine) {
    throw new Error(`Missing Kangur game engine definition for "${engineId}".`);
  }

  return engine;
};

export const getOptionalKangurGameEngineDefinition = (
  engineId: string
): KangurGameEngineDefinition | null => KANGUR_GAME_ENGINE_LIBRARY[engineId] ?? null;
