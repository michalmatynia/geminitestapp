import { describe, expect, it, vi } from 'vitest';

import {
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
} from '@/features/kangur/games/music-piano-roll-contract';

import {
  createKangurMusicPianoRollLaunchableRendererMap,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_COMPONENTS,
} from './music-piano-roll-launchable-runtime';

describe('music piano roll launchable runtime helper', () => {
  it('builds renderer entries for the shared repeat and free-play components', () => {
    const createRenderer = vi.fn((Component) => Component);

    const rendererMap = createKangurMusicPianoRollLaunchableRendererMap(createRenderer);

    expect(Object.keys(rendererMap).sort()).toEqual(
      KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map(
        (key) => KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS[key]
      ).sort()
    );
    expect(createRenderer).toHaveBeenCalledTimes(2);
    expect(rendererMap[KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat]).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_COMPONENTS[KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat]
    );
    expect(rendererMap[KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay]).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_COMPONENTS[
        KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay
      ]
    );
  });
});
