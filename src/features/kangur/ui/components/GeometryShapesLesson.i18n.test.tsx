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

import deMessages from '@/i18n/messages/de.json';
import GeometryShapesLesson from '@/features/kangur/ui/components/GeometryShapesLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('GeometryShapesLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the geometry shapes lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <GeometryShapesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Geometrische Formen'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
        launchableInstance?: { gameId?: string; instanceId?: string };
        render?: unknown;
        onShellEnter?: unknown;
      }>) ?? [];

    expect(sections.find((section) => section.id === 'podstawowe')).toMatchObject({
      title: 'Grundformen',
      description: 'Kreis, Dreieck, Quadrat, Rechteck',
    });
    expect(sections.find((section) => section.id === 'game')).toMatchObject({
      title: 'Formen zeichnen',
      description: 'Zeichne eine Form und sammle XP',
      isGame: true,
    });
    const game = games.find((candidate) => candidate.sectionId === 'game');

    expect(game?.shell).toMatchObject({
      title: 'Formen zeichnen',
    });
    expect(game?.launchableInstance).toMatchObject({
      gameId: 'geometry_shape_workshop',
      instanceId: 'geometry_shape_workshop:instance:default',
    });
    expect(game).toHaveProperty('onShellEnter');
    expect(game).not.toHaveProperty('render');

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.podstawowe?.[0]?.title).toBe('Lerne die Formen kennen');
    render(<>{slides.podstawowe?.[0]?.content}</>);

    expect(screen.getByText('Kreis')).toBeInTheDocument();
    expect(screen.getByText('0 Seiten und 0 Ecken')).toBeInTheDocument();
    expect(
      screen.getByText('Formen können sich drehen und bleiben trotzdem dieselbe Figur.')
    ).toBeInTheDocument();
  });

  it('prefers the gameTitle locale key for the game shell title', () => {
    const customMessages = structuredClone(deMessages) as Record<string, any>;
    customMessages.KangurStaticLessons.geometryShapes.game.gameTitle =
      'Benutzerdefinierte Formenwerkstatt';

    render(
      <NextIntlClientProvider locale='de' messages={customMessages}>
        <GeometryShapesLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
      }>) ?? [];

    expect(games.find((game) => game.sectionId === 'game')?.shell).toMatchObject({
      title: 'Benutzerdefinierte Formenwerkstatt',
    });
  });
});
