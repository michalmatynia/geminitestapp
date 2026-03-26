/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import ArtShapesBasicLesson from '@/features/kangur/ui/components/ArtShapesBasicLesson';
import MusicDiatonicScaleLesson from '@/features/kangur/ui/components/MusicDiatonicScaleLesson';
import { ART_SHAPES_ROTATION_PUZZLE_SECTION_ID } from '@/features/kangur/ui/components/ArtShapesBasicLesson.data';

describe('art and music stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      lessonTitle: 'Skala diatoniczna',
      Component: MusicDiatonicScaleLesson,
      sectionId: 'game_repeat',
      runtimeId: 'music_melody_repeat_lesson_stage',
      rendererId: 'music_melody_repeat_game',
      engineId: 'melody-repeat-engine',
      shellTestId: 'music-diatonic-scale-game-shell',
    },
    {
      lessonTitle: 'Skala diatoniczna',
      Component: MusicDiatonicScaleLesson,
      sectionId: 'game_freeplay',
      runtimeId: 'music_piano_roll_free_play_lesson_stage',
      rendererId: 'music_piano_roll_free_play_game',
      engineId: 'piano-roll-engine',
      shellTestId: 'music-diatonic-scale-freeplay-shell',
    },
    {
      lessonTitle: 'Podstawowe kształty',
      Component: ArtShapesBasicLesson,
      sectionId: ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
      runtimeId: 'art_shape_rotation_puzzle_lesson_stage',
      rendererId: 'art_shapes_rotation_gap_game',
      engineId: 'shape-recognition-engine',
      shellTestId: 'art-shapes-rotation-gap-game-shell',
    },
  ])(
    'passes a shared lesson-stage runtime into KangurUnifiedLesson for $sectionId',
    ({ Component, lessonTitle, sectionId, runtimeId, rendererId, engineId, shellTestId }) => {
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
          render?: unknown;
        }>) ?? [];
      const game = games.find((candidate) => candidate.sectionId === sectionId);

      expect(game?.stage).toMatchObject({
        shellTestId,
      });
      expect(game?.runtime).toMatchObject({
        runtimeId,
        rendererId,
        engineId,
      });
      expect(game).not.toHaveProperty('render');
    }
  );
});
