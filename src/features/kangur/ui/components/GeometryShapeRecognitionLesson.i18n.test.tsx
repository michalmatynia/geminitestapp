/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: () => <div data-testid='geometry-drawing-game' />,
}));

import deMessages from '@/i18n/messages/de.json';
import GeometryShapeRecognitionLesson from '@/features/kangur/ui/components/GeometryShapeRecognitionLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('GeometryShapeRecognitionLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the shape recognition lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <GeometryShapeRecognitionLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Geometrie');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: {
          runtimeId?: string;
          rendererId?: string;
          rendererProps?: Record<string, unknown>;
        };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Formen kennenlernen',
      description: 'Sieh dir die häufigsten Formen an.',
    });
    expect(sections.find((section) => section.id === 'draw')).toMatchObject({
      title: 'Spiel: Formen zeichnen',
      description: 'Zeichne Kreis, Dreieck, Quadrat, Rechteck, Oval und Raute.',
      isGame: true,
    });

    expect(games.find((game) => game.sectionId === 'draw')?.stage).toMatchObject({
      title: 'Spiel: Formen zeichnen',
    });
    expect(games.find((game) => game.sectionId === 'draw')?.runtime).toMatchObject({
      runtimeId: 'geometry_shape_drawing_lesson_stage',
      rendererId: 'geometry_drawing_game',
      rendererProps: {
        activityKey: 'training:geometry_shape_recognition:draw',
        lessonKey: 'geometry_shape_recognition',
        operation: 'geometry',
        shapeIds: ['circle', 'oval', 'triangle', 'diamond', 'square', 'rectangle'],
        showDifficultySelector: false,
      },
    });

    expect(slides.intro?.[0]?.title).toBe('Formen kennenlernen');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(screen.getByText('Kreis')).toBeInTheDocument();
    expect(screen.getByText('Rund, ohne Ecken.')).toBeInTheDocument();
    expect(screen.getByText('Quadrat')).toBeInTheDocument();
    expect(screen.getByText('4 gleich lange Seiten.')).toBeInTheDocument();
  });
});
