/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useOptionalKangurLessonTemplate: () => ({
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
        meetShapes: { title: 'Shapes', description: 'Shapes desc' },
        compareShapes: { title: 'Compare', description: 'Compare desc' },
        findShapes: { title: 'Find', description: 'Find desc' },
        rotationPuzzle: { title: 'Puzzle', description: 'Puzzle desc' },
        summary: { title: 'Summary', description: 'Summary desc' },
      },
      slides: {
        meetShapes: {
          title: 'Meet slide',
          lead: 'Meet lead',
          shapes: {
            circle: { label: 'Circle', clue: 'Circle clue' },
            square: { label: 'Square', clue: 'Square clue' },
            triangle: { label: 'Triangle', clue: 'Triangle clue' },
            rectangle: { label: 'Rectangle', clue: 'Rectangle clue' },
          },
        },
        compareShapes: {
          title: 'Compare slide',
          chips: {
            circle: 'Circle chip',
            square: 'Square chip',
            triangle: 'Triangle chip',
            rectangle: 'Rectangle chip',
          },
          detective: {
            title: 'Detective',
            caption: 'Detective caption',
          },
        },
        findShapes: {
          examples: {
            title: 'Examples',
            circle: { label: 'Ball', caption: 'Ball caption' },
            window: { label: 'Window', caption: 'Window caption' },
            pizza: { label: 'Pizza', caption: 'Pizza caption' },
            rectangle: { label: 'Brick', caption: 'Brick caption' },
          },
          puzzleClues: {
            title: 'Clues',
            lead: 'Clues lead',
            familyTitle: 'Family',
            familyCaption: 'Family caption',
            speedTitle: 'Speed',
            speedCaption: 'Speed caption',
          },
        },
        summary: {
          title: 'Summary slide',
          facts: {
            circle: 'Circle fact',
            square: 'Square fact',
            triangle: 'Triangle fact',
            rectangle: 'Rectangle fact',
          },
        },
      },
      game: {
        stageTitle: 'DB stage title',
        progress: {
          round: 'DB round {current}/{total}',
          score: 'DB score {score}',
        },
        missingTileLabel: 'DB missing tile',
        tileLabel: '{glyph} DB {tempo}',
        chooseOption: 'Choose {tile} from DB',
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
          title: 'DB finished title {score} {total}',
          subtitle: 'DB finished subtitle',
          backToLesson: 'DB back',
          playAgain: 'DB again',
        },
      },
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

import { ArtShapesRotationGapGame } from './ArtShapesRotationGapGame';

describe('ArtShapesRotationGapGame', () => {
  it('uses database-driven runtime strings when localized template content is present', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ArtShapesRotationGapGame onFinish={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('DB round 1/4')).toBeInTheDocument();
    expect(screen.getByText('DB score 0')).toBeInTheDocument();
  });
});
