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
      launchableInstance: {
        gameId: 'alphabet_first_words',
        instanceId: 'alphabet_first_words:instance:default',
      },
    },
    {
      Component: AlphabetMatchingLesson,
      lessonTitle: 'Dopasowanie liter',
      sectionId: 'game_pairs',
      sectionTitle: 'Gra litery',
      sectionDescription: 'Połącz wielkie i małe litery',
      shellTestId: 'alphabet-matching-game-shell',
      launchableInstance: {
        gameId: 'alphabet_letter_matching',
        instanceId: 'alphabet_letter_matching:instance:default',
      },
    },
    {
      Component: AlphabetSequenceLesson,
      lessonTitle: 'Alfabet - kolejność',
      sectionId: 'game_order',
      sectionTitle: 'Gra alfabet',
      sectionDescription: 'Uzupełnij brakujące litery w kolejności',
      shellTestId: 'alphabet-sequence-game-shell',
      launchableInstance: {
        gameId: 'alphabet_letter_order',
        instanceId: 'alphabet_letter_order:instance:default',
      },
    },
  ])(
    'passes the shared launchable instance into KangurUnifiedLesson for $lessonTitle',
    ({
      Component,
      lessonTitle,
      sectionId,
      sectionTitle,
      sectionDescription,
      shellTestId,
      launchableInstance,
    }) => {
      render(<Component />);

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          stage: Record<string, unknown>;
          launchableInstance?: {
            gameId?: string;
            instanceId?: string;
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
      expect(games.find((game) => game.sectionId === sectionId)?.launchableInstance).toMatchObject(
        launchableInstance
      );
      expect(games.find((game) => game.sectionId === sectionId)).not.toHaveProperty('render');
    }
  );
});
