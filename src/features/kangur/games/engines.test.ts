import { describe, expect, it } from 'vitest';

import {
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS,
  KANGUR_MUSIC_PIANO_ROLL_LESSON_VARIANT_GAME_CONFIGS,
  createDefaultKangurGameEngines,
  createDefaultKangurGames,
  getKangurGameEngineDefinition,
  getKangurGamesForEngine,
} from '@/features/kangur/games';

describe('kangur game engines', () => {
  it('keeps engine ids unique across modular engine catalogs', () => {
    const engines = createDefaultKangurGameEngines();
    const ids = engines.map((engine) => engine.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every default game with a first-class engine definition', () => {
    const engineIds = new Set(createDefaultKangurGameEngines().map((engine) => engine.id));

    expect(createDefaultKangurGames().every((game) => engineIds.has(game.engineId))).toBe(true);
  });

  it('tracks shared engine families across multiple games', () => {
    expect(getKangurGameEngineDefinition('color-harmony-engine').title).toBe(
      'Color Harmony Engine'
    );
    expect(getKangurGameEngineDefinition('color-harmony-engine').category).toBe(
      'early_learning'
    );
    expect(getKangurGamesForEngine('color-harmony-engine').map((game) => game.id)).toEqual([
      'art_color_harmony_studio',
    ]);
    expect(getKangurGameEngineDefinition('shape-drawing-engine').category).toBe('foundational');
    expect(getKangurGameEngineDefinition('symmetry-drawing-engine').category).toBe(
      'foundational'
    );
    expect(getKangurGameEngineDefinition('perimeter-drawing-engine').category).toBe(
      'foundational'
    );
    expect(getKangurGameEngineDefinition('diagram-sketch-engine').category).toBe(
      'adult_learning'
    );
    expect(getKangurGameEngineDefinition('symbol-tracing-engine').title).toBe(
      'Symbol Tracing Engine'
    );
    expect(getKangurGamesForEngine('symbol-tracing-engine').map((game) => game.id)).toEqual([
      'alphabet_trace_letters',
      'alphabet_copy_letters',
    ]);
    for (const engine of KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS) {
      expect(getKangurGameEngineDefinition(engine.id)).toMatchObject(engine);
      expect(getKangurGamesForEngine(engine.id).map((game) => game.id)).toEqual(
        KANGUR_MUSIC_PIANO_ROLL_LESSON_VARIANT_GAME_CONFIGS.filter(
          (config) => config.engineId === engine.id
        ).map((config) => config.id)
      );
    }
    expect(getKangurGamesForEngine('symmetry-drawing-engine').map((game) => game.id)).toEqual([
      'geometry_symmetry_studio',
    ]);
    expect(getKangurGamesForEngine('perimeter-drawing-engine').map((game) => game.id)).toEqual([
      'geometry_perimeter_trainer',
    ]);
    expect(getKangurGamesForEngine('classification-engine').map((game) => game.id)).toEqual(
      expect.arrayContaining([
        'logical_classification_lab',
        'english_parts_of_speech_sort',
        'agentic_brief_builder',
      ])
    );
  });
});
