/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const {
  kangurUnifiedLessonMock,
} = vi.hoisted(() => ({
  kangurUnifiedLessonMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import ArtShapesBasicLesson from './ArtShapesBasicLesson';

describe('ArtShapesBasicLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ArtShapesBasicLesson
          lessonTemplate={{
            componentId: 'art_shapes_basic',
            subject: 'art',
            ageGroup: 'six_year_old',
            label: 'Art',
            title: 'Shapes from Mongo',
            description: 'DB description',
            emoji: '🧩',
            color: 'kangur-gradient-accent-amber',
            activeBg: 'bg-amber-500',
            sortOrder: 100,
            componentContent: {
              kind: 'art_shapes_basic',
              sections: {
                meetShapes: {
                  title: 'Database shapes',
                  description: 'Database shapes description',
                },
                compareShapes: {
                  title: 'Database compare',
                  description: 'Database compare description',
                },
                findShapes: {
                  title: 'Database find',
                  description: 'Database find description',
                },
                rotationPuzzle: {
                  title: 'Database puzzle',
                  description: 'Database puzzle description',
                },
                summary: {
                  title: 'Database summary',
                  description: 'Database summary description',
                },
              },
              slides: {
                meetShapes: {
                  title: 'Database slide title',
                  lead: 'Database lead copy',
                  shapes: {
                    circle: { label: 'Database circle', clue: 'Database circle clue' },
                    square: { label: 'Database square', clue: 'Database square clue' },
                    triangle: { label: 'Database triangle', clue: 'Database triangle clue' },
                    rectangle: {
                      label: 'Database rectangle',
                      clue: 'Database rectangle clue',
                    },
                  },
                },
                compareShapes: {
                  title: 'Database compare slide',
                  chips: {
                    circle: 'DB circle chip',
                    square: 'DB square chip',
                    triangle: 'DB triangle chip',
                    rectangle: 'DB rectangle chip',
                  },
                  detective: {
                    title: 'Database detective',
                    caption: 'Database detective caption',
                  },
                },
                findShapes: {
                  examples: {
                    title: 'Database examples',
                    circle: { label: 'DB ball', caption: 'DB ball caption' },
                    window: { label: 'DB window', caption: 'DB window caption' },
                    pizza: { label: 'DB pizza', caption: 'DB pizza caption' },
                    rectangle: { label: 'DB rectangle', caption: 'DB rectangle caption' },
                  },
                  puzzleClues: {
                    title: 'Database clues',
                    lead: 'Database clues lead',
                    familyTitle: 'Database family',
                    familyCaption: 'Database family caption',
                    speedTitle: 'Database speed',
                    speedCaption: 'Database speed caption',
                  },
                },
                summary: {
                  title: 'Database summary slide',
                  facts: {
                    circle: 'Database fact circle',
                    square: 'Database fact square',
                    triangle: 'Database fact triangle',
                    rectangle: 'Database fact rectangle',
                  },
                },
              },
              game: {
                stageTitle: 'Database game title',
                progress: {
                  round: 'DB round {current}/{total}',
                  score: 'DB score {score}',
                },
                missingTileLabel: 'Database missing tile',
                tileLabel: '{glyph} DB {tempo}',
                chooseOption: 'Database choose {tile}',
                glyphs: {
                  circle: 'DB circle',
                  ball: 'DB ball',
                  square: 'DB square',
                  window: 'DB window',
                  triangle: 'DB triangle',
                  pizza: 'DB pizza',
                  rectangle: 'DB rectangle',
                  book: 'DB book',
                },
                tempos: {
                  slow: 'DB slow',
                  medium: 'DB medium',
                  fast: 'DB fast',
                },
                optionFeedback: {
                  correct: 'DB correct',
                  incorrect: 'DB incorrect',
                  answer: 'DB answer',
                },
                finished: {
                  status: 'DB finished',
                  title: 'DB title {score} {total}',
                  subtitle: 'DB subtitle',
                  backToLesson: 'DB back',
                  playAgain: 'DB again',
                },
              },
            },
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as {
      lessonTitle: string;
      sections: Array<{ id: string; title: string; description: string }>;
      slides: Record<string, Array<{ title: string }>>;
      games: Array<{ stage: { title: string } }>;
    };

    expect(props.lessonTitle).toBe('Shapes from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'meetShapes',
          title: 'Database shapes',
          description: 'Database shapes description',
        }),
        expect.objectContaining({
          id: 'rotationPuzzle',
          title: 'Database puzzle',
          description: 'Database puzzle description',
        }),
      ]),
    );
    expect(props.slides.meetShapes).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database slide title' })]),
    );
    expect(props.games[0]?.stage.title).toBe('Database game title');
  });
});
