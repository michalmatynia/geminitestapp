/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { withLegacyAlphabetWordsGameCopy } from '../../lessons/legacy-component-content.test-helpers';

const {
  kangurUnifiedLessonMock,
} = vi.hoisted(() => ({
  kangurUnifiedLessonMock: vi.fn(),
}));

vi.mock('../lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import AlphabetWordsLesson from './AlphabetWordsLesson';

describe('AlphabetWordsLesson', () => {
  it('prefers localized template component content over the static fallback payload', () => {
    render(
      <AlphabetWordsLesson
        lessonTemplate={{
          componentId: 'alphabet_words',
          subject: 'alphabet',
          ageGroup: 'six_year_old',
          label: 'Words',
          title: 'First words from Mongo',
          description: 'DB description',
          emoji: '📖',
          color: 'kangur-gradient-accent-amber',
          activeBg: 'bg-amber-500',
          sortOrder: 100,
          componentContent: {
            kind: 'alphabet_unified',
            sections: [
              {
                id: 'slowa',
                emoji: '📘',
                title: 'Database intro',
                description: 'Database section description',
                slides: [
                  {
                    title: 'Database slide',
                    lead: 'Database lead copy',
                    caption: 'Database caption copy',
                  },
                ],
              },
              {
                id: 'game_words',
                emoji: '🎮',
                title: 'Database game',
                description: 'Database game description',
                isGame: true,
                slides: [],
                gameTitle: 'Database game title',
                gameDescription: 'Database game description',
              },
              {
                id: 'summary',
                emoji: '📋',
                title: 'Database summary',
                description: 'Database summary description',
                slides: [
                  {
                    title: 'Database summary slide',
                    lead: 'Database summary lead',
                    caption: 'Database summary caption',
                  },
                ],
              },
            ],
          },
        }}
      />,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as {
      lessonTitle: string;
      sections: Array<{ id: string; title: string; description: string }>;
      slides: Record<string, Array<{ title: string }>>;
      games: Array<{
        shell: { title: string; description: string };
        launchableInstance?: { gameId: string; instanceId: string };
      }>;
    };

    expect(props.lessonTitle).toBe('First words from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'slowa',
          title: 'Database intro',
          description: 'Database section description',
        }),
        expect.objectContaining({
          id: 'game_words',
          title: 'Database game',
          description: 'Database game description',
        }),
      ]),
    );
    expect(props.slides['slowa']).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database slide' })]),
    );
    expect(props.games[0]?.shell).toEqual({
      title: 'Database game title',
      description: 'Database game description',
      accent: 'amber',
      icon: '🎮',
      shellTestId: 'alphabet-words-game-shell',
    });
    expect(props.games[0]?.launchableInstance).toEqual({
      gameId: 'alphabet_first_words',
      instanceId: 'alphabet_first_words:instance:default',
    });
  });

  it('keeps backward compatibility with legacy gameStage template copy', () => {
    render(
      <AlphabetWordsLesson
        lessonTemplate={{
          componentId: 'alphabet_words',
          subject: 'alphabet',
          ageGroup: 'six_year_old',
          label: 'Words',
          title: 'Legacy words from Mongo',
          description: 'Legacy description',
          emoji: '📖',
          color: 'kangur-gradient-accent-amber',
          activeBg: 'bg-amber-500',
          sortOrder: 100,
          componentContent: withLegacyAlphabetWordsGameCopy(
            'Legacy game title',
            'Legacy game shell description',
          ),
        }}
      />,
    );

    const props = kangurUnifiedLessonMock.mock.calls.at(-1)?.[0] as {
      games: Array<{ shell: { title: string; description: string } }>;
    };

    expect(props.games[0]?.shell).toEqual(
      expect.objectContaining({
        title: 'Legacy game title',
        description: 'Legacy game shell description',
      }),
    );
  });
});
