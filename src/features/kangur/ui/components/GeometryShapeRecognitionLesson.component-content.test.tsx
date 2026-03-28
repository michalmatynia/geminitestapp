/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import GeometryShapeRecognitionLesson from './GeometryShapeRecognitionLesson';

describe('GeometryShapeRecognitionLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometryShapeRecognitionLesson
          lessonTemplate={{
            componentId: 'geometry_shape_recognition',
            subject: 'maths',
            ageGroup: 'six_year_old',
            label: 'Geometry',
            title: 'Shape recognition from Mongo',
            description: 'DB description',
            emoji: '🔷',
            color: 'kangur-gradient-accent-emerald',
            activeBg: 'bg-emerald-500',
            sortOrder: 100,
            componentContent: {
              kind: 'geometry_shape_recognition',
              lessonTitle: 'Database geometry recognition',
              sections: {
                intro: {
                  title: 'Database intro',
                  description: 'Database intro description',
                },
                practice: {
                  title: 'Database practice section',
                  description: 'Database practice description',
                },
                draw: {
                  title: 'Database draw section',
                  description: 'Database draw description',
                },
                summary: {
                  title: 'Database summary section',
                  description: 'Database summary description',
                },
              },
              shapes: {
                circle: { label: 'DB circle', clue: 'DB circle clue' },
                square: { label: 'DB square', clue: 'DB square clue' },
                triangle: { label: 'DB triangle', clue: 'DB triangle clue' },
                rectangle: { label: 'DB rectangle', clue: 'DB rectangle clue' },
                oval: { label: 'DB oval', clue: 'DB oval clue' },
                diamond: { label: 'DB diamond', clue: 'DB diamond clue' },
              },
              clues: {
                title: 'Database clues',
                lead: 'Database clues lead',
                chips: {
                  corners: 'DB corners',
                  sides: 'DB sides',
                  curves: 'DB curves',
                  longShortSides: 'DB long short',
                },
                inset: 'Database clues inset',
              },
              practice: {
                slideTitle: 'Database practice title',
                emptyRounds: 'Database empty rounds',
                finished: {
                  status: 'Database finished',
                  title: 'Database score {score}/{total}',
                  subtitle: 'Database subtitle',
                  restart: 'Database restart',
                },
                progress: {
                  round: 'Database round {current}/{total}',
                  score: 'Database score {score}',
                },
                question: 'Database question',
                feedback: {
                  correct: 'Database correct',
                  incorrect: 'Database incorrect {shape}',
                },
                actions: {
                  next: 'Database next',
                  finish: 'Database finish',
                },
              },
              intro: {
                title: 'Database intro slide',
                lead: 'Database intro lead',
              },
              summary: {
                title: 'Database summary slide',
                status: 'Database ready',
                lead: 'Database summary lead',
                caption: 'Database summary caption',
              },
              draw: {
                stageTitle: 'Database draw game',
                difficultyLabel: 'Database difficulty',
                finishLabel: 'Database finish label',
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
      games: Array<{
        sectionId: string;
        shell: { title: string; description?: string };
      }>;
    };

    expect(props.lessonTitle).toBe('Shape recognition from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database intro',
          description: 'Database intro description',
        }),
        expect.objectContaining({
          id: 'practice',
          title: 'Database practice title',
          description: 'Database practice description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database intro slide' }),
        expect.objectContaining({ title: 'Database clues' }),
      ]),
    );
    expect(props.games.find((game) => game.sectionId === 'practice')?.shell.title).toBe(
      'Database practice title',
    );
    expect(props.games.find((game) => game.sectionId === 'draw')?.shell.title).toBe(
      'Database draw game',
    );
  });
});
