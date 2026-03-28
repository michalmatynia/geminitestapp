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
        shell: Record<string, unknown>;
        launchableInstance?: { gameId?: string; instanceId?: string };
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
    expect(games.find((game) => game.sectionId === 'game_prepositions')?.shell).toMatchObject({
      title: 'Präpositionen-Sprint',
      description: 'Kurzes Auswahlspiel',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions')?.launchableInstance
    ).toMatchObject({
      gameId: 'english_prepositions_time_place',
      instanceId: 'english_prepositions_time_place:instance:default',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_order')?.shell
    ).toMatchObject({
      title: 'Wortstellung Warm-up',
      description: 'Ordne Sätze mit Präpositionen',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_sort')?.launchableInstance
    ).toMatchObject({
      gameId: 'english_prepositions_sort',
      instanceId: 'english_prepositions_sort:instance:default',
    });
    expect(
      games.find((game) => game.sectionId === 'game_prepositions_order')?.launchableInstance
    ).toMatchObject({
      gameId: 'english_prepositions_order',
      instanceId: 'english_prepositions_order:instance:default',
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
