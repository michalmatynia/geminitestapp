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
import GeometrySymmetryLesson from '@/features/kangur/ui/components/GeometrySymmetryLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('GeometrySymmetryLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the symmetry lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <GeometrySymmetryLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Symmetrie');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'os')).toMatchObject({
      title: 'Symmetrieachse',
      description: 'Die Linie, die die Figur teilt',
    });
    expect(sections.find((section) => section.id === 'game')).toMatchObject({
      title: 'Symmetrie-Spiegel',
      description: 'Zeichne die Achse und ergänze die Spiegelung',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'game')?.stage).toMatchObject({
      title: 'Symmetrie-Spiegel',
    });
    expect(games.find((game) => game.sectionId === 'game')?.runtime).toMatchObject({
      runtimeId: 'geometry_symmetry_studio_lesson_stage',
      rendererId: 'geometry_symmetry_game',
    });

    expect(slides.intro?.[0]?.title).toBe('Was ist Symmetrie?');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Eine Figur ist symmetrisch, wenn nach dem Falten in der Mitte beide Seiten zusammenpassen.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Ein Schmetterling ist fast symmetrisch.')).toBeInTheDocument();
    expect(
      screen.getByText('Symmetrie bedeutet: linke Seite = rechte Seite (oder oben = unten).')
    ).toBeInTheDocument();
  });
});
