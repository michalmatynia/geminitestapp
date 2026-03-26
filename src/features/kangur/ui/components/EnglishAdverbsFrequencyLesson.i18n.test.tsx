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
import EnglishAdverbsFrequencyLesson from '@/features/kangur/ui/components/EnglishAdverbsFrequencyLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishAdverbsFrequencyLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the adverbs-of-frequency lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishAdverbsFrequencyLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Adverbien der Häufigkeit'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Einführung',
      description: 'Was Häufigkeitswörter bedeuten',
    });
    expect(sections.find((section) => section.id === 'position')).toMatchObject({
      title: 'Position',
      description: 'Wo das Adverb im Satz steht',
    });
    expect(sections.find((section) => section.id === 'game_frequency_studio')).toMatchObject({
      title: 'Frequency Studio',
      description: 'Baue einen animierten Wochenplan',
    });

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        runtime?: { runtimeId?: string; rendererId?: string };
      }>) ?? [];
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      sectionId: 'game_frequency_studio',
      runtime: {
        runtimeId: 'english_adverbs_frequency_routine_lesson_stage',
        rendererId: 'english_adverbs_frequency_routine_game',
      },
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};
    expect(slides.intro?.[0]?.title).toBe('Wie oft passiert das?');
    expect(slides.position?.[2]?.title).toBe('Ordnung reparieren');
    expect(slides.answer?.[1]?.title).toBe('Wähle das beste Häufigkeitswort');
    expect(slides.answer?.[3]?.title).toBe('Baue deine eigene Woche');
    expect(slides.answer?.[4]?.title).toBe('Sprich über einen Ort');

    render(<>{slides.intro?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Adverbien der Häufigkeit sagen uns, wie oft eine Handlung passiert. Mit ihnen sprechen wir über Routinen und Gewohnheiten.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('always').length).toBeGreaterThan(0);
    expect(screen.getAllByText('never').length).toBeGreaterThan(0);

    render(<>{slides.position?.[2]?.content}</>);

    expect(
      screen.getByText(
        'Manchmal landet das Adverb an der falschen Stelle. Schiebe es dorthin zurück, wo es im Englischen hingehört.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('He is never late.')).toBeInTheDocument();

    render(<>{slides.answer?.[1]?.content}</>);

    expect(
      screen.getByText(
        'Ordne den Hinweis dem Adverb zu, das am besten passt, bevor du deine eigene Routine baust.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Ich mache jeden Tag nach der Schule meine Hausaufgaben.')).toBeInTheDocument();

    render(<>{slides.answer?.[3]?.content}</>);

    expect(
      screen.getByText(
        'Verwandle die Häufigkeitswörter jetzt in deine eigene Gewohnheitskarte. Wähle einfache Tätigkeiten und sage, wie oft sie passieren.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('I sometimes go to the park.')).toBeInTheDocument();

    render(<>{slides.answer?.[4]?.content}</>);

    expect(
      screen.getByText(
        'Wähle einen Ort, den du kennst, und sage, wie oft du dorthin gehst. Häufigkeitswörter machen deinen Satz viel klarer.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('I usually go to the library.')).toBeInTheDocument();
  });
});
