/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const useOptionalKangurLessonTemplateMock = vi.fn();

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useOptionalKangurLessonTemplate: (...args: unknown[]) =>
    useOptionalKangurLessonTemplateMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

import ShapeRecognitionStageGame from './ShapeRecognitionStageGame';
import { SHAPE_ROUNDS, type ShapeId } from './GeometryShapeRecognition.shared';

describe('ShapeRecognitionStageGame', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    const labels: Record<ShapeId, string> = {
      circle: 'DB circle',
      square: 'DB square',
      triangle: 'DB triangle',
      rectangle: 'DB rectangle',
      oval: 'DB oval',
      diamond: 'DB diamond',
    };

    useOptionalKangurLessonTemplateMock.mockReturnValue({
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
          intro: { title: 'Intro', description: 'Intro description' },
          practice: { title: 'Practice', description: 'Practice description' },
          draw: { title: 'Draw', description: 'Draw description' },
          summary: { title: 'Summary', description: 'Summary description' },
        },
        shapes: {
          circle: { label: labels.circle, clue: 'DB circle clue' },
          square: { label: labels.square, clue: 'DB square clue' },
          triangle: { label: labels.triangle, clue: 'DB triangle clue' },
          rectangle: { label: labels.rectangle, clue: 'DB rectangle clue' },
          oval: { label: labels.oval, clue: 'DB oval clue' },
          diamond: { label: labels.diamond, clue: 'DB diamond clue' },
        },
        clues: {
          title: 'Clues',
          lead: 'Clue lead',
          chips: {
            corners: 'Corners',
            sides: 'Sides',
            curves: 'Curves',
            longShortSides: 'Long short',
          },
          inset: 'Inset',
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
          title: 'Intro title',
          lead: 'Intro lead',
        },
        summary: {
          title: 'Summary title',
          status: 'Summary status',
          lead: 'Summary lead',
          caption: 'Summary caption',
        },
        draw: {
          stageTitle: 'Draw stage title',
          difficultyLabel: 'Difficulty',
          finishLabel: 'Database finish label',
        },
      },
    });

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ShapeRecognitionStageGame onFinish={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Database question')).toBeInTheDocument();
    expect(screen.getByText('Database round 1/6')).toBeInTheDocument();
    expect(screen.getByText('Database score 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: labels.square }));
    expect(screen.getByText(`Database incorrect ${labels.circle}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Database next' }));

    for (let index = 1; index < SHAPE_ROUNDS.length; index += 1) {
      const round = SHAPE_ROUNDS[index]!;
      fireEvent.click(screen.getByRole('button', { name: labels[round.correct] }));
      fireEvent.click(
        screen.getByRole('button', {
          name: index + 1 >= SHAPE_ROUNDS.length ? 'Database finish' : 'Database next',
        }),
      );
    }

    expect(screen.getByText('Database finished')).toBeInTheDocument();
    expect(screen.getByText('Database score 5/6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Database finish label' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Database restart' })).toBeInTheDocument();
  });
});
