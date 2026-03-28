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
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import EnglishSentenceStructureLesson from '@/features/kangur/ui/components/EnglishSentenceStructureLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishSentenceStructureLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the sentence structure lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishSentenceStructureLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Satzbau'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'blueprint')).toMatchObject({
      title: 'Bauplan',
      description: 'SVO und das Grundmuster des Satzes',
    });
    expect(sections.find((section) => section.id === 'questions')).toMatchObject({
      title: 'Fragen',
      description: 'Do/Does in der Praxis',
    });
    expect(sections.find((section) => section.id === 'game')).toMatchObject({
      title: 'Satzbau-Spiel',
      description: 'Baue und korrigiere englische Sätze',
      isGame: true,
    });
    expect(sections.find((section) => section.id === 'summary')).toMatchObject({
      title: 'Zusammenfassung',
      description: 'Die wichtigsten Regeln',
    });
    expect(games.find((game) => game.sectionId === 'game')?.launchableInstance).toMatchObject({
      gameId: 'english_sentence_builder',
      instanceId: getKangurBuiltInGameInstanceId('english_sentence_builder'),
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.blueprint?.[0]?.title).toBe('SVO-Bauplan');
    render(<>{slides.blueprint?.[0]?.content}</>);

    expect(
      screen.getByText('Die häufigste Satzordnung ist Subject → Verb → Object.')
    ).toBeInTheDocument();
    expect(screen.getByText('Subject + Verb + Object')).toBeInTheDocument();

    render(<>{slides.questions?.[0]?.content}</>);

    expect(
      screen.getByText('Do you understand the graph?').closest('.kangur-lesson-visual-supporting')
    ).toBeTruthy();
    expect(screen.getByText('Do you understand the graph?').closest('.kangur-lesson-inset')).toBeNull();
  });
});
