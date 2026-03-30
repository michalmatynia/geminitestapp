import { describe, expect, it } from 'vitest';

import {
  KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS,
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS,
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS,
  KANGUR_MUSIC_PIANO_ROLL_LESSON_VARIANT_GAME_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_TOP_SECTION_TEST_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
  KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS,
} from '../music-piano-roll-contract';

describe('music piano roll contract', () => {
  it('derives the exported music configs from one keyed source', () => {
    for (const key of KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS) {
      const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];
      const runtimeConfig =
        KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS[config.launchableRuntimeId];
      const engineDefinition = KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS.find(
        (entry) => entry.id === config.engineId
      );
      const engineImplementation = KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS.find(
        (entry) => entry.engineId === config.engineId
      );
      const lessonVariantGame = KANGUR_MUSIC_PIANO_ROLL_LESSON_VARIANT_GAME_CONFIGS.find(
        (entry) => entry.id === config.gameId
      );
      const builtInInstance = KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS[config.gameId];

      expect(runtimeConfig).toEqual({
        engineId: config.engineId,
        rendererId: config.rendererId,
        screen: config.launchableRuntimeId,
        shell: {
          icon: config.runtimeIcon,
          shellTestId: config.topSectionTestId,
        },
      });
      expect(engineDefinition).toMatchObject({
        id: config.engineId,
        ...config.engineDefinition,
      });
      expect(engineImplementation).toEqual({
        engineId: config.engineId,
        ownership: 'shared_runtime',
        runtimeIds: [config.runtimeComponentId],
        summary: config.engineImplementationSummary,
      });
      expect(lessonVariantGame).toMatchObject({
        id: config.gameId,
        engineId: config.engineId,
        launchableRuntimeId: config.launchableRuntimeId,
        ...config.lessonVariantGame,
      });
      expect(builtInInstance).toEqual({
        contentSetId: KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS[key],
        description: config.builtInInstanceDescription,
        id: KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS[key],
        title: config.builtInInstanceTitle,
      });
      expect(KANGUR_MUSIC_PIANO_ROLL_TOP_SECTION_TEST_IDS[key]).toBe(config.topSectionTestId);
      expect(KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS[key]).toEqual({
        gameScreen: `${config.gameId}.game-screen`,
        lessonVariant: `${config.gameId}.lesson-stage`,
      });
    }

    expect(KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS.repeat).toEqual({
      pianoRoll: {
        keyPrefix: 'music-melody-repeat-key',
        shell: 'music-melody-repeat-piano-roll',
        stepPrefix: 'music-melody-repeat-step',
      },
      root: 'music-melody-repeat-game',
    });
    expect(KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS.freePlay).toEqual({
      audioStatus: 'music-piano-roll-freeplay-audio',
      finishButton: 'music-piano-roll-freeplay-finish',
      modeStatus: 'music-piano-roll-freeplay-mode',
      pianoRoll: {
        keyPrefix: 'music-piano-roll-freeplay-key',
        shell: 'music-piano-roll-freeplay-shell',
        stepPrefix: 'music-piano-roll-freeplay-step',
      },
      root: 'music-piano-roll-freeplay-game',
    });
  });
});
