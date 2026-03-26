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
import EnglishSubjectVerbAgreementLesson from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishSubjectVerbAgreementLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the agreement lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishSubjectVerbAgreementLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Subjekt-Verb-Ubereinstimmung'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'core')).toMatchObject({
      title: 'Grundlagen der Ubereinstimmung',
      description: 'Subjekt + Verb in einer Linie',
    });
    expect(sections.find((section) => section.id === 'game_agreement')).toMatchObject({
      title: 'Spiel: Subjekt-Verb-Ubereinstimmung',
      description: 'Klicke in jedem Satz die richtige Verbform an.',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'game_agreement')?.stage).toMatchObject({
      title: 'Spiel: Subjekt-Verb-Ubereinstimmung',
      description: 'Klicke in jedem Satz die richtige Verbform an.',
    });
    expect(games.find((game) => game.sectionId === 'game_agreement')?.runtime).toMatchObject({
      runtimeId: 'english_subject_verb_agreement_lesson_stage',
      rendererId: 'english_subject_verb_agreement_game',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.core?.[0]?.title).toBe('Subjekt + Verb = passend');
    render(<>{slides.core?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Subjekt-Verb-Ubereinstimmung ist eine einfache Regel: Das Verb richtet sich nach der Zahl des Subjekts. Im Present Simple geht es oft um die Endung -s.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Singular → Verb + -s. Plural → Grundform.')
    ).toBeInTheDocument();
    const singularMatchSentence = screen.getByText(
      (_content, node) => node?.textContent === 'The coach talks before the match.'
    );

    expect(singularMatchSentence.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(singularMatchSentence.closest('.kangur-lesson-inset')).toBeNull();
  });
});
