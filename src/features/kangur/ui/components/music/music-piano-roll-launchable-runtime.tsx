'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import {
  KANGUR_MUSIC_PIANO_ROLL_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
} from '@/features/kangur/games/music-piano-roll-contract';

export type KangurMusicPianoRollLaunchableComponentProps = {
  onFinish: () => void;
};

const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_IMPORTERS = {
  freePlay: () => import('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame'),
  repeat: () => import('@/features/kangur/ui/components/music/MusicMelodyRepeatGame'),
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_COMPONENTS = Object.fromEntries(
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [
    KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].rendererId,
    dynamic(KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_IMPORTERS[key], { ssr: false }),
  ])
) as Record<
  (typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS)[keyof typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS],
  ComponentType<KangurMusicPianoRollLaunchableComponentProps>
>;

export const createKangurMusicPianoRollLaunchableRendererMap = <T,>(
  createRenderer: (Component: ComponentType<KangurMusicPianoRollLaunchableComponentProps>) => T
) =>
  Object.fromEntries(
    KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [
      KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].rendererId,
      createRenderer(
        KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_COMPONENTS[
          KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].rendererId
        ]
      ),
    ])
  ) as Record<
    (typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS)[keyof typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS],
    T
  >;

export const createKangurMusicPianoRollLaunchableOnFinishRendererMap = <TProps extends {
  onFinish: () => void;
}>() =>
  createKangurMusicPianoRollLaunchableRendererMap((Component) => ({
    render: ({ onFinish }: TProps): React.JSX.Element => <Component onFinish={onFinish} />,
  }));
