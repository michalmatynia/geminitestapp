/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
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
import EnglishPartsOfSpeechLesson from '@/features/kangur/ui/components/EnglishPartsOfSpeechLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishPartsOfSpeechLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the pronouns lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishPartsOfSpeechLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Englisch: Pronomen');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games = (capturedProps?.games as Array<{ sectionId: string; stage: Record<string, unknown> }>) ?? [];

    expect(
      sections.find((section) => section.id === 'subject_pronouns')
    ).toMatchObject({
      title: 'Subjektpronomen',
      description: 'Wer führt die Handlung in der Aufgabe aus?',
    });
    expect(
      sections.find((section) => section.id === 'game_parts_of_speech')
    ).toMatchObject({
      title: 'Wortarten-Spiel',
      description: 'Ziehe die Wörter in die richtigen Kategorien',
      isGame: true,
    });
    expect(
      games.find((game) => game.sectionId === 'game_pronouns_warmup')?.stage
    ).toMatchObject({
      title: 'Pronomen Warm-up',
      description: 'Schnelles Warm-up mit Pronomen in Mathe-Sätzen',
    });
    expect(
      games.find((game) => game.sectionId === 'game_parts_of_speech')?.stage
    ).toMatchObject({
      title: 'Wortarten-Spiel',
      description: 'Ziehe die Wörter in die richtigen Kategorien',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.subject_pronouns?.[0]?.title).toBe('Subjektpronomen');
    render(<>{slides.subject_pronouns?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Subjektpronomen zeigen, wer die Handlung ausführt. In Matheaufgaben ist das oft ein Kind, eine Lehrkraft oder ein Team.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Achte darauf, wer etwas tut: solve, check, graph, explain.')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('du / ihr');
  });
});
