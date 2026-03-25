import type { KangurGameEngineDefinition } from '@/shared/contracts/kangur-games';

export const cloneKangurGameEngineDefinition = (
  engine: KangurGameEngineDefinition
): KangurGameEngineDefinition => ({
  ...engine,
  mechanics: [...engine.mechanics],
  interactionModes: [...engine.interactionModes],
  surfaces: [...engine.surfaces],
  tags: [...engine.tags],
});
