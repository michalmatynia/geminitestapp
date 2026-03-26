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
import EnglishPrepositionsLesson from '@/features/kangur/ui/components/EnglishPrepositionsLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishPrepositionsLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishPrepositionsLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Präpositionen'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
      }>) ?? [];

    expect(
      sections.find((section) => section.id === 'intro')
    ).toMatchObject({
      title: 'Einführung',
      description: 'Warum Präpositionen wichtig sind',
    });
    expect(
      sections.find((section) => section.id === 'game_prepositions_sort')
    ).toMatchObject({
      title: 'Sortieren: Zeit + Ort + Beziehungen',
      description: 'Ziehe die Wendungen zu den richtigen Beziehungen',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'game_prepositions')?.stage).toMatchObject({
      title: 'Präpositionen-Sprint',
      description: 'Kurzes Auswahlspiel',
    });
    expect(games.find((game) => game.sectionId === 'game_prepositions')?.runtime).toMatchObject({
      runtimeId: 'english_prepositions_lesson_stage',
      rendererId: 'english_prepositions_game',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_order')?.stage
    ).toMatchObject({
      title: 'Wortstellung Warm-up',
      description: 'Ordne Sätze mit Präpositionen',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_sort')?.runtime
    ).toMatchObject({
      runtimeId: 'english_prepositions_sort_lesson_stage',
      rendererId: 'english_prepositions_sort_game',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_order')?.runtime
    ).toMatchObject({
      runtimeId: 'english_prepositions_order_lesson_stage',
      rendererId: 'english_prepositions_order_game',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Präpositionen im Überblick');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Präpositionen zeigen, wann und wo etwas passiert. In Aufgaben und Anweisungen tauchen sie ständig auf.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Zeit und Ort in einem Satz.')).toBeInTheDocument();

    render(<>{slides.time?.[0]?.content}</>);

    expect(screen.getByText('at noon').closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(screen.getByText('at noon').closest('.kangur-lesson-inset')).toBeNull();
  });
});
