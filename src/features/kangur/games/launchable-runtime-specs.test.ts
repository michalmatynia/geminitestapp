import { describe, expect, it } from 'vitest';

import { KANGUR_LAUNCHABLE_GAME_SCREENS } from './catalog';
import { createDefaultKangurGames } from './defaults';
import {
  getKangurLaunchableGameRuntimeSpec,
  KANGUR_LAUNCHABLE_GAME_RUNTIME_SPECS,
} from './launchable-runtime-specs';
import {
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
} from './music-piano-roll-contract';
import { kangurLaunchableGameRuntimeSpecSchema } from '@/shared/contracts/kangur-games';

describe('launchable runtime specs', () => {
  it('covers every launchable screen with a schema-valid serializable runtime spec', () => {
    expect(Object.keys(KANGUR_LAUNCHABLE_GAME_RUNTIME_SPECS).sort()).toEqual(
      [...KANGUR_LAUNCHABLE_GAME_SCREENS].sort()
    );

    for (const screen of KANGUR_LAUNCHABLE_GAME_SCREENS) {
      const spec = getKangurLaunchableGameRuntimeSpec(screen);

      expect(spec.screen).toBe(screen);
      expect(spec.engineId).toBeTruthy();
      expect(kangurLaunchableGameRuntimeSpecSchema.parse(spec)).toEqual(spec);
    }
  });

  it('keeps seeded launchable game-screen variants pointed at runtime specs instead of screen-only branching', () => {
    const gameScreenVariants = createDefaultKangurGames().flatMap((game) =>
      game.variants.filter((variant) => variant.surface === 'game_screen')
    );
    const launchableGames = createDefaultKangurGames().filter((game) =>
      game.variants.some((variant) => variant.surface === 'game_screen')
    );

    expect(gameScreenVariants.length).toBeGreaterThan(0);
    expect(launchableGames.length).toBeGreaterThan(0);
    expect(launchableGames.every((game) => game.legacyScreenIds.length === 0)).toBe(true);
    expect(gameScreenVariants.every((variant) => Boolean(variant.launchableRuntimeId))).toBe(true);
    expect(gameScreenVariants.some((variant) => Boolean(variant.legacyScreenId))).toBe(false);
    expect(
      gameScreenVariants.map((variant) => variant.launchableRuntimeId).filter(Boolean)
    ).toEqual(
      expect.arrayContaining([
        'clock_quiz',
        'logical_patterns_quiz',
        KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat,
        KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay,
      ])
    );
  });

  it('derives the shared music launchable specs from one runtime config contract', () => {
    for (const config of Object.values(KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS)) {
      expect(getKangurLaunchableGameRuntimeSpec(config.screen)).toEqual(
        expect.objectContaining({
          engineId: config.engineId,
          rendererId: config.rendererId,
          screen: config.screen,
          shell: expect.objectContaining({
            icon: config.shell.icon,
            shellTestId: config.shell.shellTestId,
          }),
        })
      );
    }
  });

  it('keeps the general adverbs runtime spec pinned to the shared sentence-builder engine', () => {
    expect(getKangurLaunchableGameRuntimeSpec('english_adverbs_quiz')).toEqual(
      expect.objectContaining({
        screen: 'english_adverbs_quiz',
        engineId: 'sentence-builder-engine',
        rendererId: 'english_adverbs_action_game',
        shell: expect.objectContaining({
          shellTestId: expect.any(String),
        }),
      })
    );
  });

  it('keeps the comparatives runtime spec pinned to the shared sentence-builder engine', () => {
    expect(getKangurLaunchableGameRuntimeSpec('english_compare_and_crown_quiz')).toEqual(
      expect.objectContaining({
        screen: 'english_compare_and_crown_quiz',
        engineId: 'sentence-builder-engine',
        rendererId: 'english_compare_and_crown_game',
        shell: expect.objectContaining({
          shellTestId: expect.any(String),
        }),
      })
    );
  });
});
