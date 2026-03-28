/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { getKangurDefaultGameInstanceId } from '@/features/kangur/games';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import ArtColorsHarmonyLesson from '@/features/kangur/ui/components/ArtColorsHarmonyLesson';
import ArtShapesBasicLesson from '@/features/kangur/ui/components/ArtShapesBasicLesson';
import MusicDiatonicScaleLesson, {
  MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS,
  MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS,
} from '@/features/kangur/ui/components/MusicDiatonicScaleLesson';
import { ART_SHAPES_ROTATION_PUZZLE_SECTION_ID } from '@/features/kangur/ui/components/ArtShapesBasicLesson.data';

describe('art and music stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      lessonTitle: 'Harmony of colors',
      Component: ArtColorsHarmonyLesson,
      sectionId: 'gameHarmony',
      launchableGameId: 'art_color_harmony_studio',
      shellTestId: 'art-colors-harmony-game-shell',
    },
    {
      lessonTitle: 'Skala diatoniczna',
      Component: MusicDiatonicScaleLesson,
      sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.sectionId,
      launchableGameId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.launchableInstance.gameId,
      expectedInstanceId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.launchableInstance.instanceId,
      shellTestId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.stage.shellTestId,
    },
    {
      lessonTitle: 'Skala diatoniczna',
      Component: MusicDiatonicScaleLesson,
      sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.sectionId,
      launchableGameId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.launchableInstance.gameId,
      expectedInstanceId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.launchableInstance.instanceId,
      shellTestId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.stage.shellTestId,
    },
    {
      lessonTitle: 'Podstawowe kształty',
      Component: ArtShapesBasicLesson,
      sectionId: ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
      launchableGameId: 'art_shape_rotation_puzzle',
      shellTestId: 'art-shapes-rotation-gap-game-shell',
    },
  ])(
    'passes the expected game wiring into KangurUnifiedLesson for $sectionId',
    ({ Component, lessonTitle, sectionId, launchableGameId, expectedInstanceId, shellTestId }) => {
      render(
        <NextIntlClientProvider locale='pl' messages={plMessages}>
          <Component />
        </NextIntlClientProvider>
      );

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          stage: Record<string, unknown>;
          runtime?: { runtimeId?: string; rendererId?: string; engineId?: string };
          launchableInstance?: { gameId?: string; instanceId?: string };
          render?: unknown;
        }>) ?? [];
      const game = games.find((candidate) => candidate.sectionId === sectionId);

      expect(game?.stage).toMatchObject({
        shellTestId,
      });
      expect(game?.launchableInstance).toMatchObject({
        gameId: launchableGameId,
        instanceId: expectedInstanceId ?? getKangurDefaultGameInstanceId(launchableGameId),
      });
      expect(game).not.toHaveProperty('render');
    }
  );
});
