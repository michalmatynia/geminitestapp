import { describe, expect, it } from 'vitest';

import {
  createDefaultKangurGameEngines,
  createDefaultKangurGames,
  getKangurGameEngineDefinition,
  getKangurGamesForEngine,
} from '@/features/kangur/games';

describe('kangur game engines', () => {
  it('covers every default game with a first-class engine definition', () => {
    const engineIds = new Set(createDefaultKangurGameEngines().map((engine) => engine.id));

    expect(createDefaultKangurGames().every((game) => engineIds.has(game.engineId))).toBe(true);
  });

  it('tracks shared engine families across multiple games', () => {
    expect(getKangurGameEngineDefinition('classification-engine').title).toBe(
      'Classification Engine'
    );
    expect(getKangurGamesForEngine('classification-engine').map((game) => game.id)).toEqual([
      'logical_classification_lab',
      'english_parts_of_speech_sort',
    ]);
  });
});
