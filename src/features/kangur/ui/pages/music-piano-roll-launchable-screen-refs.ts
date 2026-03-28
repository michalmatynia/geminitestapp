import { useMemo, useRef, type RefObject } from 'react';

import type { KangurLaunchableGameScreen } from '@/shared/contracts/kangur-games';
import {
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
} from '@/features/kangur/games/music-piano-roll-contract';

type LaunchableScreenRef = RefObject<HTMLDivElement | null>;

export type KangurMusicPianoRollLaunchableScreenRefInput = Record<
  (typeof KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS)[number],
  LaunchableScreenRef
>;

export const createKangurMusicPianoRollLaunchableScreenRefs = (
  refs: KangurMusicPianoRollLaunchableScreenRefInput
): Pick<
  Record<KangurLaunchableGameScreen, LaunchableScreenRef>,
  | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat
  | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay
> =>
  Object.fromEntries(
    KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS[key],
      refs[key],
    ])
  ) as Pick<
    Record<KangurLaunchableGameScreen, LaunchableScreenRef>,
    | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat
    | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay
  >;

export const useKangurMusicPianoRollLaunchableScreenRefs = (): Pick<
  Record<KangurLaunchableGameScreen, LaunchableScreenRef>,
  | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat
  | typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay
> => {
  const repeat = useRef<HTMLDivElement | null>(null);
  const freePlay = useRef<HTMLDivElement | null>(null);

  return useMemo(
    () => createKangurMusicPianoRollLaunchableScreenRefs({ freePlay, repeat }),
    [freePlay, repeat]
  );
};
