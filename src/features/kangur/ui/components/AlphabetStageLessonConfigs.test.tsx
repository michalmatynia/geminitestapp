/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import AlphabetMatchingLesson from '@/features/kangur/ui/components/AlphabetMatchingLesson';
import AlphabetSequenceLesson from '@/features/kangur/ui/components/AlphabetSequenceLesson';
import AlphabetWordsLesson from '@/features/kangur/ui/components/AlphabetWordsLesson';

describe('alphabet stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      Component: AlphabetWordsLesson,
      lessonTitle: 'Pierwsze słowa',
      sectionId: 'game_words',
      sectionTitle: 'Gra słowa',
      sectionDescription: 'Dopasuj obrazek do właściwego słowa',
      shellTestId: 'alphabet-words-game-shell',
      runtimeId: 'alphabet_first_words_lesson_stage',
      rendererId: 'alphabet_literacy_stage_game',
      engineId: 'letter-match-engine',
      rendererProps: { literacyMatchSetId: 'alphabet_first_words' },
    },
    {
      Component: AlphabetMatchingLesson,
      lessonTitle: 'Dopasowanie liter',
      sectionId: 'game_pairs',
      sectionTitle: 'Gra litery',
      sectionDescription: 'Połącz wielkie i małe litery',
      shellTestId: 'alphabet-matching-game-shell',
      runtimeId: 'alphabet_letter_matching_lesson_stage',
      rendererId: 'alphabet_literacy_stage_game',
      engineId: 'letter-match-engine',
      rendererProps: { literacyMatchSetId: 'alphabet_letter_matching' },
    },
    {
      Component: AlphabetSequenceLesson,
      lessonTitle: 'Alfabet - kolejność',
      sectionId: 'game_order',
      sectionTitle: 'Gra alfabet',
      sectionDescription: 'Uzupełnij brakujące litery w kolejności',
      shellTestId: 'alphabet-sequence-game-shell',
      runtimeId: 'alphabet_letter_order_lesson_stage',
      rendererId: 'logical_patterns_workshop_game',
      engineId: 'pattern-sequence-engine',
      rendererProps: { patternSetId: 'alphabet_letter_order' },
    },
  ])(
    'passes the shared stage runtime into KangurUnifiedLesson for $lessonTitle',
    ({
      Component,
      lessonTitle,
      sectionId,
      sectionTitle,
      sectionDescription,
      shellTestId,
      runtimeId,
      rendererId,
      engineId,
      rendererProps,
    }) => {
      render(<Component />);

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          stage: Record<string, unknown>;
          runtime?: {
            runtimeId?: string;
            rendererId?: string;
            engineId?: string;
            rendererProps?: Record<string, unknown>;
          };
          render?: unknown;
        }>) ?? [];

      expect(sections.find((section) => section.id === sectionId)).toMatchObject({
        title: sectionTitle,
        description: sectionDescription,
        isGame: true,
      });
      expect(games.find((game) => game.sectionId === sectionId)?.stage).toMatchObject({
        shellTestId,
        title: sectionTitle,
      });
      expect(games.find((game) => game.sectionId === sectionId)?.runtime).toMatchObject({
        runtimeId,
        rendererId,
        engineId,
        rendererProps,
      });
      expect(games.find((game) => game.sectionId === sectionId)).not.toHaveProperty('render');
    }
  );
});
