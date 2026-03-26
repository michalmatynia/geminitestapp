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

import AlphabetSequenceLesson from '@/features/kangur/ui/components/AlphabetSequenceLesson';

describe('alphabet stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('passes the shared alphabet sequence lesson-stage runtime into KangurUnifiedLesson', () => {
    render(<AlphabetSequenceLesson />);

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Alfabet - kolejność');

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

    expect(sections.find((section) => section.id === 'game_order')).toMatchObject({
      title: 'Gra alfabet',
      description: 'Uzupełnij brakujące litery w kolejności',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'game_order')?.stage).toMatchObject({
      shellTestId: 'alphabet-sequence-game-shell',
      title: 'Gra alfabet',
    });
    expect(games.find((game) => game.sectionId === 'game_order')?.runtime).toMatchObject({
      runtimeId: 'alphabet_letter_order_lesson_stage',
      rendererId: 'logical_patterns_workshop_game',
      engineId: 'pattern-sequence-engine',
      rendererProps: {
        patternSetId: 'alphabet_letter_order',
      },
    });
    expect(games.find((game) => game.sectionId === 'game_order')).not.toHaveProperty('render');
  });
});
