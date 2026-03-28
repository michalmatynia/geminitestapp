import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import {
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
} from '@/features/kangur/games/music-piano-roll-contract';

import { createKangurMusicPianoRollLaunchableScreenRefs } from './music-piano-roll-launchable-screen-refs';

describe('music piano roll launchable screen refs helper', () => {
  it('maps the shared repeat and free-play runtime ids to the provided refs', () => {
    const repeat = createRef<HTMLDivElement>();
    const freePlay = createRef<HTMLDivElement>();

    const screenRefs = createKangurMusicPianoRollLaunchableScreenRefs({
      freePlay,
      repeat,
    });

    expect(Object.keys(screenRefs).sort()).toEqual(
      KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map(
        (key) => KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS[key]
      ).sort()
    );
    expect(screenRefs[KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat]).toBe(repeat);
    expect(screenRefs[KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay]).toBe(freePlay);
  });
});
