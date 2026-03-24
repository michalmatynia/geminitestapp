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
import EnglishAdjectivesLesson from '@/features/kangur/ui/components/EnglishAdjectivesLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishAdjectivesLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the adjectives lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishAdjectivesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Englisch: Adjektive');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Einführung',
      description: 'Was Adjektive tun',
    });
    expect(sections.find((section) => section.id === 'order')).toMatchObject({
      title: 'Reihenfolge',
      description: 'Adjektive vor Nomen setzen',
    });
    expect(sections.find((section) => section.id === 'game_adjective_studio')).toMatchObject({
      title: 'Adjektiv-Studio',
      description: 'Belebe die Szene mit Adjektivkarten',
    });

    const games = (capturedProps?.games as Array<Record<string, unknown>>) ?? [];
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      sectionId: 'game_adjective_studio',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};
    expect(slides.intro?.[0]?.title).toBe('Adjektive malen ein Bild');
    expect(slides.intro?.[1]?.title).toBe('Personen, Orte, Dinge');
    expect(slides.order?.[1]?.title).toBe('Baue eine klare Wortgruppe');
    expect(slides.describe?.[2]?.title).toBe('Beschreibe Lernen und Spielen');

    render(<>{slides.intro?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Adjektive beschreiben Personen, Orte und Dinge. Sie geben einem Nomen Farbe, Größe, Gefühl und Detail.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('big yellow cupboard, soft rug, long blue curtains')
    ).toBeInTheDocument();

    render(<>{slides.intro?.[1]?.content}</>);

    expect(
      screen.getByText(
        'Du kannst Adjektive für Personen, Orte oder einzelne Dinge benutzen. Sie funktionieren fast überall im Satz.'
      )
    ).toBeInTheDocument();

    render(<>{slides.describe?.[2]?.content}</>);

    expect(
      screen.getByText(
        'Dieselben Regeln funktionieren auch, wenn du über desk, lamp, book, slide, kite und bench sprichst.'
      )
    ).toBeInTheDocument();
  });
});
